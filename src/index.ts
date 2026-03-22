import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs";
import path from "node:path";
import { JellyfinClient, type JellyfinItem } from "./jellyfin.js";
import { getMappingsFromEnv, linuxToWindows, isMapped } from "./paths.js";
import { classifyQuality } from "./quality.js";

// ─── Config ────────────────────────────────────────────────────────────────

const JELLYFIN_URL = process.env.JELLYFIN_URL ?? "http://100.114.52.11:8096";
const JELLYFIN_TOKEN = process.env.JELLYFIN_TOKEN ?? "";

if (!JELLYFIN_TOKEN) {
  process.stderr.write("ERROR: JELLYFIN_TOKEN environment variable is required.\n");
  process.exit(1);
}

const jellyfin = new JellyfinClient(JELLYFIN_URL, JELLYFIN_TOKEN);
const pathMappings = getMappingsFromEnv();

// ─── Helpers ───────────────────────────────────────────────────────────────

function arg<T>(args: Record<string, unknown> | undefined, key: string, def: T): T {
  if (!args || args[key] === undefined) return def;
  return args[key] as T;
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// ─── Server setup ──────────────────────────────────────────────────────────

const server = new Server(
  { name: "jellyfin-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ─── Tool definitions ──────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_stats",
      description:
        "Returns a quick health overview of the Jellyfin library: total counts, " +
        "items missing metadata, and number of potential duplicate groups.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "find_missing_metadata",
      description:
        "Finds movies or series that are missing TMDB and/or IMDB identifiers. " +
        "Useful for tracking unidentified files (e.g. raw scene filenames). " +
        "Returns name, path, and which IDs are present/missing.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["Movie", "Series", "All"],
            description: "Item type to check. Default: All",
          },
          include_partial: {
            type: "boolean",
            description:
              "Also include items that have only ONE of IMDB/TMDB. Default: false",
          },
        },
      },
    },
    {
      name: "analyze_duplicates",
      description:
        "Groups movies or series by TMDB ID to find duplicate versions. " +
        "For each group, classifies the quality of every version " +
        "(resolution, source, codec) and suggests a version label for multi-version naming.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["Movie", "Series"],
            description: "Item type. Default: Movie",
          },
          min_versions: {
            type: "number",
            description: "Minimum version count to include a group. Default: 2",
          },
          sort_by: {
            type: "string",
            enum: ["count", "name", "size"],
            description: "Sort results by version count, name, or total size. Default: count",
          },
        },
      },
    },
    {
      name: "find_cd_splits",
      description:
        "Finds movie files that appear to be CD-split parts (cd1/cd2, part1/part2, " +
        "1of2/2of2, disc1/disc2) and may not be stacking correctly in Jellyfin. " +
        "Reports whether each file is in a subdir (unfixed) or already in same dir (likely OK).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "generate_move_plan",
      description:
        "Generates a multi-version consolidation plan for a specific TMDB movie ID " +
        "(or 'all' for every duplicate group). Shows the exact from→to renames needed " +
        "to set up Jellyfin multi-version naming, including Windows UNC paths.",
      inputSchema: {
        type: "object",
        properties: {
          tmdb_id: {
            type: "string",
            description: "TMDB ID of the movie, or 'all' for all duplicate groups.",
          },
        },
        required: ["tmdb_id"],
      },
    },
    {
      name: "execute_move",
      description:
        "Moves or renames a single file on disk. Accepts Linux paths (as Jellyfin " +
        "reports them) and automatically converts to Windows UNC paths. " +
        "Always use dry_run: true first to verify paths before executing.",
      inputSchema: {
        type: "object",
        properties: {
          from_path: {
            type: "string",
            description: "Current Linux path of the file (as shown in Jellyfin).",
          },
          to_path: {
            type: "string",
            description: "Target Linux path.",
          },
          dry_run: {
            type: "boolean",
            description: "If true (default), only shows what would happen — no files moved.",
          },
        },
        required: ["from_path", "to_path"],
      },
    },
    {
      name: "refresh_library",
      description: "Triggers a full Jellyfin library rescan to pick up file changes.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// ─── Tool handlers ─────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  switch (name) {
    case "get_stats":
      return ok(await getStats());

    case "find_missing_metadata":
      return ok(
        await findMissingMetadata(
          arg(a, "type", "All"),
          arg(a, "include_partial", false),
        ),
      );

    case "analyze_duplicates":
      return ok(
        await analyzeDuplicates(
          arg(a, "type", "Movie"),
          arg(a, "min_versions", 2),
          arg(a, "sort_by", "count"),
        ),
      );

    case "find_cd_splits":
      return ok(await findCdSplits());

    case "generate_move_plan":
      return ok(await generateMovePlan(arg(a, "tmdb_id", "")));

    case "execute_move":
      return ok(
        await executeMove(
          arg(a, "from_path", ""),
          arg(a, "to_path", ""),
          arg(a, "dry_run", true),
        ),
      );

    case "refresh_library":
      await jellyfin.refreshLibrary();
      return ok({ success: true, message: "Library refresh triggered." });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─── Implementations ───────────────────────────────────────────────────────

async function getStats() {
  const [movies, series] = await Promise.all([
    jellyfin.getItems({ IncludeItemTypes: "Movie", Recursive: "true", Fields: "Path,ProviderIds" }),
    jellyfin.getItems({ IncludeItemTypes: "Series", Recursive: "true", Fields: "Path,ProviderIds" }),
  ]);

  const missingMovieMeta = movies.Items.filter(
    (i) => !i.ProviderIds?.Tmdb && !i.ProviderIds?.Imdb,
  ).length;
  const missingSeriesMeta = series.Items.filter(
    (i) => !i.ProviderIds?.Tmdb && !i.ProviderIds?.Tvdb,
  ).length;

  const tmdbGroups = new Map<string, number>();
  for (const item of movies.Items) {
    const id = item.ProviderIds?.Tmdb;
    if (id) tmdbGroups.set(id, (tmdbGroups.get(id) ?? 0) + 1);
  }
  const duplicateGroups = [...tmdbGroups.values()].filter((c) => c > 1).length;

  return {
    movies: movies.TotalRecordCount,
    series: series.TotalRecordCount,
    movies_missing_metadata: missingMovieMeta,
    series_missing_metadata: missingSeriesMeta,
    movie_duplicate_groups: duplicateGroups,
    note: "Duplicate groups = movies sharing the same TMDB ID (candidates for multi-version consolidation).",
  };
}

async function findMissingMetadata(type: string, includePartial: boolean) {
  const types = type === "All" ? ["Movie", "Series"] : [type];

  const results: Array<{
    name: string;
    type: string;
    path: string;
    has_imdb: boolean;
    has_tmdb: boolean;
    has_tvdb: boolean;
  }> = [];

  for (const t of types) {
    const { Items } = await jellyfin.getItems({
      IncludeItemTypes: t,
      Recursive: "true",
      Fields: "Path,ProviderIds",
    });

    for (const item of Items) {
      const hasImdb = Boolean(item.ProviderIds?.Imdb);
      const hasTmdb = Boolean(item.ProviderIds?.Tmdb);
      const hasTvdb = Boolean(item.ProviderIds?.Tvdb);

      const missingBoth = !hasImdb && !hasTmdb;
      const missingAny = !hasImdb || !hasTmdb;

      if (missingBoth || (includePartial && missingAny)) {
        results.push({
          name: item.Name,
          type: t,
          path: item.Path ?? "(no path)",
          has_imdb: hasImdb,
          has_tmdb: hasTmdb,
          has_tvdb: hasTvdb,
        });
      }
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));

  return {
    total: results.length,
    missing_all_ids: results.filter((r) => !r.has_imdb && !r.has_tmdb).length,
    partial_match: results.filter((r) => (r.has_imdb || r.has_tmdb) && !(r.has_imdb && r.has_tmdb))
      .length,
    items: results,
    tip: "Fix unidentified files by creating a .nfo file alongside the video with the TMDB/IMDB ID, or rename the file to match the movie title + year so Jellyfin can identify it automatically.",
  };
}

async function analyzeDuplicates(type: string, minVersions: number, sortBy: string) {
  const { Items } = await jellyfin.getItems({
    IncludeItemTypes: type,
    Recursive: "true",
    Fields: "Path,ProviderIds,MediaSources",
  });

  const groups = new Map<string, JellyfinItem[]>();
  for (const item of Items) {
    const id = item.ProviderIds?.Tmdb;
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(item);
  }

  const result = [...groups.entries()]
    .filter(([, items]) => items.length >= minVersions)
    .map(([tmdbId, items]) => {
      const versions = items.map((item) => {
        const p = item.Path ?? "";
        const sizeBytes = item.MediaSources?.[0]?.Size;
        const q = classifyQuality(p, sizeBytes);
        return {
          jellyfin_name: item.Name,
          path: p,
          size_gb: q.sizeGB,
          resolution: q.resolution,
          source: q.source,
          codec: q.codec,
          container: q.container,
          suggested_label: q.versionLabel,
        };
      });

      const resolutionOrder = ["2160p", "1080p", "720p", "SD", "unknown"];
      versions.sort(
        (a, b) => resolutionOrder.indexOf(a.resolution) - resolutionOrder.indexOf(b.resolution),
      );

      const totalSizeGB = Math.round(versions.reduce((s, v) => s + v.size_gb, 0) * 100) / 100;

      return {
        tmdb_id: tmdbId,
        name: items[0].Name,
        version_count: items.length,
        versions,
        total_size_gb: totalSizeGB,
      };
    });

  if (sortBy === "count") result.sort((a, b) => b.version_count - a.version_count);
  else if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === "size") result.sort((a, b) => b.total_size_gb - a.total_size_gb);

  return {
    total_duplicate_groups: result.length,
    total_redundant_files: result.reduce((s, g) => s + g.version_count - 1, 0),
    groups: result,
  };
}

async function findCdSplits() {
  const CD_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /[._\s-]cd[12][._\s\-$]/i, label: "cd1/cd2 in filename" },
    { re: /\/cd[12]\//i, label: "cd1/cd2 subdirectory" },
    { re: /\\cd[12]\\/i, label: "cd1/cd2 subdirectory" },
    { re: /[._\s-]disc\s?[12][._\s\-$]/i, label: "disc1/disc2" },
    { re: /[._\s-]part\s?[12][._\s\-$]/i, label: "part1/part2" },
    { re: /[._\s(-][12]of2[._\s)-]/i, label: "1of2/2of2" },
    { re: /[._\s-]d[12][._\s\-$]/i, label: "d1/d2" },
  ];

  const SUBDIR_PATTERN = /[/\\]cd[12][/\\]/i;

  const { Items } = await jellyfin.getItems({
    IncludeItemTypes: "Movie",
    Recursive: "true",
    Fields: "Path,ProviderIds",
  });

  type SplitStatus = "in_subdir_unfixed" | "same_dir_likely_ok" | "needs_investigation";

  const suspects: Array<{
    name: string;
    path: string;
    pattern: string;
    tmdb_id: string | null;
    status: SplitStatus;
  }> = [];

  for (const item of Items) {
    const p = item.Path ?? "";
    for (const { re, label } of CD_PATTERNS) {
      if (re.test(p)) {
        suspects.push({
          name: item.Name,
          path: p,
          pattern: label,
          tmdb_id: item.ProviderIds?.Tmdb ?? null,
          status: SUBDIR_PATTERN.test(p) ? "in_subdir_unfixed" : "same_dir_likely_ok",
        });
        break;
      }
    }
  }

  // If the same TMDB ID appears more than once, the parts are NOT stacked → flag them
  const tmdbCount = new Map<string, number>();
  for (const s of suspects) {
    if (s.tmdb_id) tmdbCount.set(s.tmdb_id, (tmdbCount.get(s.tmdb_id) ?? 0) + 1);
  }
  for (const s of suspects) {
    if (
      s.status === "same_dir_likely_ok" &&
      s.tmdb_id &&
      (tmdbCount.get(s.tmdb_id) ?? 0) > 1
    ) {
      s.status = "needs_investigation";
    }
  }

  const statusOrder: SplitStatus[] = [
    "in_subdir_unfixed",
    "needs_investigation",
    "same_dir_likely_ok",
  ];
  suspects.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return {
    total_found: suspects.length,
    in_subdir_unfixed: suspects.filter((s) => s.status === "in_subdir_unfixed").length,
    needs_investigation: suspects.filter((s) => s.status === "needs_investigation").length,
    same_dir_likely_ok: suspects.filter((s) => s.status === "same_dir_likely_ok").length,
    items: suspects,
  };
}

async function generateMovePlan(tmdbId: string) {
  if (!tmdbId) return { error: "tmdb_id is required (or 'all')" };

  const { Items } = await jellyfin.getItems({
    IncludeItemTypes: "Movie",
    Recursive: "true",
    Fields: "Path,ProviderIds,MediaSources",
  });

  let versionGroups: JellyfinItem[][];

  if (tmdbId === "all") {
    const byTmdb = new Map<string, JellyfinItem[]>();
    for (const item of Items) {
      const id = item.ProviderIds?.Tmdb;
      if (!id) continue;
      if (!byTmdb.has(id)) byTmdb.set(id, []);
      byTmdb.get(id)!.push(item);
    }
    versionGroups = [...byTmdb.values()].filter((g) => g.length > 1);
  } else {
    const group = Items.filter((i) => i.ProviderIds?.Tmdb === tmdbId);
    if (group.length === 0) return { error: `No items found for TMDB ID: ${tmdbId}` };
    versionGroups = [group];
  }

  const plans = versionGroups.map((group) => {
    const first = group[0];
    const firstPath = first.Path ?? "";

    // Build canonical folder name: Jellyfin title + year extracted from path
    const yearMatch = firstPath.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch?.[0] ?? "";
    const folderName = year ? `${first.Name} (${year})` : first.Name;

    // Find the /Filmer/ root to place the new folder under
    const posixParts = firstPath.split("/");
    const filmerIdx = posixParts.findIndex((p) => p === "Filmer");
    const targetBase =
      filmerIdx >= 0 ? posixParts.slice(0, filmerIdx + 1).join("/") : path.posix.dirname(firstPath);
    const targetFolder = `${targetBase}/${folderName}`;

    const operations = group.map((item) => {
      const p = item.Path ?? "";
      const sizeBytes = item.MediaSources?.[0]?.Size;
      const q = classifyQuality(p, sizeBytes);
      const ext = path.posix.extname(p);
      const newFilename = `${folderName} - ${q.versionLabel}${ext}`;
      const toPath = `${targetFolder}/${newFilename}`;

      return {
        from_linux: p,
        to_linux: toPath,
        version_label: q.versionLabel,
        size_gb: q.sizeGB,
        already_in_target_dir: path.posix.dirname(p) === targetFolder,
        from_windows: linuxToWindows(p, pathMappings),
        to_windows: linuxToWindows(toPath, pathMappings),
        path_mapped: isMapped(p, pathMappings),
      };
    });

    return {
      tmdb_id: first.ProviderIds?.Tmdb,
      name: first.Name,
      target_folder_linux: targetFolder,
      target_folder_windows: linuxToWindows(targetFolder, pathMappings),
      operations,
    };
  });

  return {
    total_groups: plans.length,
    total_operations: plans.reduce((s, p) => s + p.operations.length, 0),
    plans,
    warning:
      "Review all operations carefully. Run execute_move with dry_run: true on each operation before executing.",
  };
}

async function executeMove(fromLinux: string, toLinux: string, dryRun: boolean) {
  if (!fromLinux || !toLinux) {
    return { error: "from_path and to_path are required." };
  }

  if (!isMapped(fromLinux, pathMappings)) {
    return {
      error:
        "Could not map from_path to a Windows UNC path. Check MOUNT_* environment variables.",
      from_linux: fromLinux,
      configured_mappings: pathMappings,
    };
  }

  const fromWin = linuxToWindows(fromLinux, pathMappings);
  const toWin = linuxToWindows(toLinux, pathMappings);
  const dstDir = path.dirname(toWin);

  if (dryRun) {
    return {
      dry_run: true,
      from_windows: fromWin,
      to_windows: toWin,
      source_exists: fs.existsSync(fromWin),
      dest_dir_exists: fs.existsSync(dstDir),
      dest_file_exists: fs.existsSync(toWin),
      would_overwrite: fs.existsSync(toWin),
      note: "Set dry_run: false to execute.",
    };
  }

  // Safety: refuse to overwrite existing files
  if (fs.existsSync(toWin)) {
    return {
      error: "Destination file already exists. Delete it first or choose a different name.",
      to_windows: toWin,
    };
  }

  if (!fs.existsSync(fromWin)) {
    return { error: "Source file not found.", from_windows: fromWin };
  }

  try {
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true });
    }

    try {
      fs.renameSync(fromWin, toWin);
    } catch (err: unknown) {
      // Cross-device (different UNC shares): fall back to copy + delete
      if ((err as NodeJS.ErrnoException).code === "EXDEV") {
        fs.copyFileSync(fromWin, toWin);
        fs.unlinkSync(fromWin);
      } else {
        throw err;
      }
    }

    return { success: true, from: fromWin, to: toWin };
  } catch (err) {
    return { error: String(err), from: fromWin, to: toWin };
  }
}

// ─── Start ─────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
