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

  // Fallback defaults for this Jellyfin setup
  if (mappings.length === 0) {
    const usb1Linux = process.env.USB1_LINUX ?? "/mnt/usb1";
    const usb1Windows = process.env.USB1_WINDOWS ?? "\\\\100.69.132.23\\usbshare1-2";
    mappings.push({ linuxPath: usb1Linux, windowsPath: usb1Windows });

    const videoLinux = process.env.VIDEO_LINUX ?? "/mnt/video";
    const videoWindows = process.env.VIDEO_WINDOWS ?? "";
    if (videoWindows) {
      mappings.push({ linuxPath: videoLinux, windowsPath: videoWindows });
    }
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
