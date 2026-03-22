export type Resolution = "2160p" | "1080p" | "720p" | "SD" | "unknown";
export type Source = "Bluray" | "WEB" | "DVD" | "HDTV" | "unknown";
export type Codec = "H.265" | "H.264" | "XviD/DivX" | "unknown";

export interface VideoQuality {
  resolution: Resolution;
  source: Source;
  codec: Codec;
  container: string;
  sizeGB: number;
  versionLabel: string;
}

export function classifyQuality(filePath: string, sizeBytes?: number): VideoQuality {
  const f = filePath.toUpperCase();

  const resolution: Resolution =
    /\b(2160P|4K|UHD)\b/.test(f) ? "2160p" :
    /\b1080[PI]\b/.test(f) ? "1080p" :
    /\b720P\b/.test(f) ? "720p" :
    /\b(BDRIP|BRRIP|BLURAY|BLU-RAY)\b/.test(f) ? "1080p" : // BDRip is almost always 1080p
    /\b(DVDRIP|DVD|DVDSCR|R5|HDTV|XVID|DIVX)\b/.test(f) ? "SD" : "unknown";

  const source: Source =
    /\b(BLURAY|BDRIP|BRRIP|BLU-RAY)\b/.test(f) ? "Bluray" :
    /\b(WEB-DL|WEBDL|WEBRIP|WEB)\b/.test(f) ? "WEB" :
    /\b(DVDRIP|DVD|DVDSCR|R5)\b/.test(f) ? "DVD" :
    /\bHDTV\b/.test(f) ? "HDTV" : "unknown";

  const codec: Codec =
    /\b(X265|H\.265|H265|HEVC)\b/.test(f) ? "H.265" :
    /\b(X264|H\.264|H264|AVC)\b/.test(f) ? "H.264" :
    /\b(XVID|DIVX)\b/.test(f) ? "XviD/DivX" : "unknown";

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "unknown";
  const sizeGB = sizeBytes ? Math.round((sizeBytes / 1024 ** 3) * 100) / 100 : 0;

  const versionLabel = buildVersionLabel(f, resolution, source, sizeGB);

  return { resolution, source, codec, container: ext, sizeGB, versionLabel };
}

function buildVersionLabel(
  upperPath: string,
  resolution: Resolution,
  source: Source,
  sizeGB: number,
): string {
  // Special named editions
  if (upperPath.includes("RIFFTRAX")) return `${resolution !== "unknown" ? resolution : "1080p"} Rifftrax`;
  if (upperPath.includes("REMUX")) return `${resolution} Remux`;

  switch (resolution) {
    case "2160p":
      if (source === "Bluray" && sizeGB > 20) return "2160p Remux";
      return "2160p";
    case "1080p":
      if (source === "Bluray" && sizeGB > 20) return "1080p Remux";
      if (source === "Bluray") return "1080p Bluray";
      if (source === "WEB") return "1080p WEB-DL";
      return "1080p";
    case "720p":
      return source === "WEB" ? "720p WEB-DL" : "720p";
    case "SD":
      return "DVD";
    default:
      return source === "DVD" ? "DVD" : "SD";
  }
}
