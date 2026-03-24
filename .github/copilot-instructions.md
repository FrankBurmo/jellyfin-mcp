# GitHub Copilot Instructions — jellyfin-mcpserver

## Project Purpose

This is a **Model Context Protocol (MCP) server** built in TypeScript that exposes tools for managing a Jellyfin media library. It connects to a Jellyfin instance via its REST API and performs library analysis and file operations (move/rename) to maintain a well-organised media collection.

The server communicates over stdio transport and is designed to be used from VS Code Copilot Chat or any other MCP-compatible client.

---

## Architecture

```
src/
  index.ts      — MCP server entry point, tool definitions and request handlers
  jellyfin.ts   — Jellyfin REST API client (fetch-based, typed responses)
  paths.ts      — Linux → Windows UNC path mapping (reads MOUNT_* env vars)
  quality.ts    — Filename quality classifier (resolution, source, codec)
dist/           — Compiled output (tsc → run with node dist/index.js)
docs/           — Documentation (see JELLYFIN-MEDIA-GUIDE.md)
```

---

## Available Tools

| Tool | Description |
|---|---|
| `get_stats` | Library health overview: total counts, missing metadata, duplicate groups |
| `find_missing_metadata` | Items without TMDB/IMDB IDs — finds unidentified files |
| `analyze_duplicates` | Groups items by TMDB ID; classifies quality per version |
| `find_cd_splits` | Finds CD-split files (CD1/CD2, Part1/Part2) not stacking correctly |
| `generate_move_plan` | Generates rename plan for multi-version consolidation |
| `execute_move` | Moves/renames a file. Always accepts Linux paths; converts to Windows UNC internally. `dry_run: true` by default |
| `refresh_library` | Triggers Jellyfin library rescan |
| `analyze_tv_structure` | Full structural audit of the TV library: duplicate series entries, series folders with release-pack names, episodes in per-episode subdirectories, wrong season numbers (year/release number mistaken for season number) |

---

## Configuration

All config is via environment variables in `.env`:

```env
JELLYFIN_URL=http://<server>:<port>
JELLYFIN_TOKEN=<api-token>          # Jellyfin API key (Dashboard → API Keys)

# Path mappings: Jellyfin reports Linux paths; files are accessed via Windows UNC
MOUNT_1_LINUX=/mnt/disk1
MOUNT_1_WINDOWS=\\server\share1

MOUNT_2_LINUX=/mnt/disk2
MOUNT_2_WINDOWS=\\server\share2
```

`getMappingsFromEnv()` in `paths.ts` reads all `MOUNT_N_LINUX` / `MOUNT_N_WINDOWS` pairs automatically — add as many as needed.

---

## Key Conventions

### Path Handling
- Jellyfin API returns **Linux paths** (`/mnt/...`)
- File operations (move/rename) require **Windows UNC paths** (`\\server\share\...`)
- `linuxToWindows(path, mappings)` converts between them
- Always check `isMapped(path, mappings)` before attempting file operations

### File Naming — Multi-version Movies
Jellyfin stacks multiple versions of the same film when they share:
- Identical base name: `Movie Title (Year)`
- Same folder
- Version label suffix: `Movie Title (Year) - 1080p.mkv`

### CD Splits
Supported stacking suffixes: `- CD1`/`- CD2`, `- Part1`/`- Part2`, `- Disc1`/`- Disc2`, `.cd1`/`.cd2`

### NFO Files for Metadata
When a file can't be identified by filename alone, write a `movie.nfo` (or `tvshow.nfo`) alongside the file:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>Exact Title</title>
  <year>YYYY</year>
  <uniqueid type="imdb" default="true">ttXXXXXXX</uniqueid>
  <uniqueid type="tmdb">NNNNNN</uniqueid>
</movie>
```
NFO files take precedence over scraped metadata and persist across library refreshes.

### Writing Files from Windows PowerShell
Use `[System.IO.File]::WriteAllText()` with explicit UTF-8 encoding — this reliably handles special characters:
```powershell
$enc = [System.Text.Encoding]::UTF8
[System.IO.File]::WriteAllText("\\server\share\path\movie.nfo", $xmlContent, $enc)
```
Avoid `Set-Content` for XML NFO files as it may add BOM or use wrong encoding.

### Paths with Brackets
PowerShell treats `[` and `]` as wildcards. Use `-LiteralPath` for `Test-Path`, `Get-Item`, etc.:
```powershell
Test-Path -LiteralPath "\\server\share\Movie [1999]\file.mkv"
```

---

## Build & Run

```bash
npm install
npm run build     # tsc → dist/
node dist/index.js
```

The server uses stdio transport — it reads JSON-RPC from stdin and writes to stdout.

---

## Jellyfin API Notes

- **API key** (`X-MediaBrowser-Token` header) is sufficient for all read operations and library refresh
- `POST /Items/{id}` metadata update requires a **user session token** (from `/Users/AuthenticateByName`) — the API key alone returns 400. Use NFO files instead for permanent metadata overrides.
- Library refresh: `POST /Library/Refresh` — no body required, just the token header.

---

## Media Organisation Reference

For full naming conventions, NFO format, artwork, subtitle naming, TV specials, anime,
and library best practices, see **[docs/JELLYFIN-MEDIA-GUIDE.md](../docs/JELLYFIN-MEDIA-GUIDE.md)**.

Key rules summarised:
- One folder per movie: `Title (Year)/Title (Year).mkv`
- Multi-version: identical base name, version label after ` - ` (e.g. `Film (2020) - 1080p.mkv`)
- TV episodes: `Series Title SxxExx.mkv` in `Season XX/` folders
- NFO files override all scraped metadata and persist across database rebuilds
- Always `dry_run=true` before any `execute_move` call
