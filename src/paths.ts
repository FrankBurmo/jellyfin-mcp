export interface MountMapping {
  linuxPath: string;
  windowsPath: string;
}

/**
 * Reads mount mappings from environment variables.
 * Expects pairs: MOUNT_1_LINUX / MOUNT_1_WINDOWS, MOUNT_2_LINUX / MOUNT_2_WINDOWS, etc.
 * Falls back to USB1/VIDEO defaults if none are set.
 */
export function getMappingsFromEnv(): MountMapping[] {
  const mappings: MountMapping[] = [];

  for (let i = 1; ; i++) {
    const linux = process.env[`MOUNT_${i}_LINUX`];
    const windows = process.env[`MOUNT_${i}_WINDOWS`];
    if (!linux || !windows) break;
    mappings.push({ linuxPath: linux, windowsPath: windows });
  }

  return mappings;
}

/** Converts a Linux path (as Jellyfin reports it) to a Windows UNC path. */
export function linuxToWindows(linuxPath: string, mappings: MountMapping[]): string {
  for (const m of mappings) {
    if (linuxPath.startsWith(m.linuxPath)) {
      return m.windowsPath + linuxPath.slice(m.linuxPath.length).replace(/\//g, "\\");
    }
  }
  return linuxPath; // unmapped — return as-is
}

/** Returns true if the linux path can be mapped to a Windows path. */
export function isMapped(linuxPath: string, mappings: MountMapping[]): boolean {
  return mappings.some((m) => linuxPath.startsWith(m.linuxPath));
}
