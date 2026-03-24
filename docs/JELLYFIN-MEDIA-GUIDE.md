# Jellyfin Media Organisation — Best Practice Guide

This document defines the rules, naming conventions, and workflows used to maintain a
well-organised Jellyfin media library. Follow these guidelines when renaming, moving,
or adding files so that Jellyfin can identify and display everything correctly.

---

## Table of Contents

1. [Folder structure](#1-folder-structure)
2. [Multi-version movies (multiple quality files)](#2-multi-version-movies)
3. [CD-split / multi-part movies](#3-cd-split--multi-part-movies)
4. [Metadata files (.nfo)](#4-metadata-files-nfo)
5. [Artwork files](#5-artwork-files)
6. [Subtitles and external tracks](#6-subtitles-and-external-tracks)
7. [Extras, featurettes, and trailers](#7-extras-featurettes-and-trailers)
8. [TV specials (Season 0)](#8-tv-specials-season-0)
9. [Anime naming](#9-anime-naming)
10. [Handling missing or unidentified metadata](#10-handling-missing-or-unidentified-metadata)
11. [Duplicates](#11-duplicates)
12. [Path mapping (Linux ↔ Windows)](#12-path-mapping-linux--windows)
13. [Cleanup workflow](#13-cleanup-workflow)
14. [MCP server tools](#14-mcp-server-tools)
15. [Library and performance best practices](#15-library-and-performance-best-practices)

---

## 1. Folder Structure

### Movies

One folder per movie, named `Title (Year)`:

```
/Movies/
  The Matrix (1999)/
    The Matrix (1999).mkv
    movie.nfo
    poster.jpg
    fanart.jpg
  Oppenheimer (2023)/
    Oppenheimer (2023).mkv
```

**Rules:**
- Always include the year in parentheses — this prevents misidentification when
  multiple films share the same title.
- No extra tokens in the folder or filename (`BluRay`, `1080p`, `YIFY`, etc.) unless
  they are version labels for multi-version files (see §2).
- Use **MKV** as the preferred container for new rips — wide codec support, chapter
  metadata, embedded subtitles, and no DRM.

### TV Series

One folder per series, season sub-folders, episodes named with `SxxExx`:

```
/TV/
  Breaking Bad/
    tvshow.nfo
    Season 01/
      Breaking Bad S01E01.mkv
      Breaking Bad S01E02.mkv
    Season 02/
      ...
  The Wire/
    Season 01/
      The Wire S01E01 - The Target.mkv
```

**Rules:**
- Series folder name must match the exact title as TMDB/TVDB lists it.
- Season folders: `Season 01`, `Season 02`, … (leading zero required for correct sorting).
- Episode filename: `Series Title SxxExx.ext` — the optional episode title after ` - ` is
  safe to include.
- Multi-episode files: `Series Title S01E01E02.mkv` (consecutive episodes concatenated).

---

## 2. Multi-version Movies

Jellyfin supports **multiple quality versions of the same film** in a single entry.
When the user hits Play, they can pick the desired version.

### Naming convention

Files must be in the **same folder**, share an **identical base name**, and have a
version label after ` - ` (space-hyphen-space):

```
/Movies/The Matrix (1999)/
  The Matrix (1999) - 2160p.mkv
  The Matrix (1999) - 1080p.mkv
  The Matrix (1999) - DVD.mkv
```

### Rules

- Base name **must** be identical across all versions (title + year).
- Version label separator: ` - ` (space, hyphen, space).
- Labels ending in `p` or `i` are sorted highest-to-lowest automatically
  (`2160p → 1080p → 720p → 480p`).
- Other labels (`DVD`, `Remux`, `Directors Cut`) are sorted alphabetically.
- Brackets are optional: `Film (2020) - [1080p].mkv` also works.

### Recommended version labels

| Source              | Label           | Example                             |
|---------------------|-----------------|-------------------------------------|
| UHD Blu-ray Remux   | `2160p Remux`   | `Film (2020) - 2160p Remux.mkv`     |
| UHD Blu-ray encode  | `2160p`         | `Film (2020) - 2160p.mkv`           |
| 1080p Blu-ray Remux | `1080p Remux`   | `Film (2020) - 1080p Remux.mkv`     |
| 1080p Blu-ray encode| `1080p`         | `Film (2020) - 1080p.mkv`           |
| 1080p WEB-DL        | `1080p WEB-DL`  | `Film (2020) - 1080p WEB-DL.mkv`    |
| 720p encode         | `720p`          | `Film (2020) - 720p.mkv`            |
| DVD rip             | `DVD`           | `Film (2020) - DVD.mkv`             |
| Special cut         | `Directors Cut` | `Film (2020) - Directors Cut.mkv`   |

### Multi-version does NOT apply to TV series

Jellyfin does not support multi-version for individual episodes. For TV series, keep
only the best available version per episode and delete the rest.

---

## 3. CD-split / Multi-part Movies

Older rips split across CD1/CD2 can be auto-stacked by Jellyfin if the filenames use
a supported suffix:

### Supported suffixes

| Format              | Example                       |
|---------------------|-------------------------------|
| `- CD1` / `- CD2`  | `Film (1999) - CD1.avi`       |
| `- Part1` / `- Part2` | `Film (1999) - Part1.mkv` |
| `- Disc1` / `- Disc2` | `Film (1999) - Disc1.mkv` |
| `.cd1` / `.cd2`     | `film.cd1.avi`                |

Scene names like `release-filmcd1.avi` or `film.a.avi` **do not stack** — rename them.

### Procedure

1. Identify CD-split files (two files in the same folder with similar names lacking a
   supported suffix).
2. Rename both files to `Title (Year) - CD1.ext` and `Title (Year) - CD2.ext`.
3. Rename accompanying subtitle files (`.srt`/`.idx`/`.sub`) the same way.
4. Trigger a library refresh in Jellyfin.

---

## 4. Metadata Files (.nfo)

Jellyfin reads `.nfo` XML files placed alongside the video file. Use them to lock
metadata to the correct film or series — especially when the filename alone is unclear
(scene names, raw DVD rips named `title00.mkv`, misspelled folder names).

### Placement

| Type       | Filename       | Location                          |
|------------|----------------|-----------------------------------|
| Movie      | `movie.nfo`    | Inside the movie's folder         |
| TV Series  | `tvshow.nfo`   | Inside the series root folder     |
| Episode    | `<episode>.nfo`| Same folder as the episode file   |

### Minimal NFO format

```xml
<!-- Movie -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>The Matrix</title>
  <year>1999</year>
  <uniqueid type="imdb" default="true">tt0133093</uniqueid>
  <uniqueid type="tmdb">603</uniqueid>
</movie>

<!-- TV Series -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<tvshow>
  <title>Breaking Bad</title>
  <year>2008</year>
  <uniqueid type="imdb" default="true">tt0903747</uniqueid>
  <uniqueid type="tmdb">1396</uniqueid>
</tvshow>
```

### Writing .nfo files from Windows PowerShell

Use `[System.IO.File]::WriteAllText()` with explicit UTF-8 encoding to avoid BOM and
encoding issues with special characters:

```powershell
$xml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>My Film</title>
  <year>2001</year>
  <uniqueid type="imdb" default="true">tt0000000</uniqueid>
  <uniqueid type="tmdb">0000</uniqueid>
</movie>
'@
$enc = [System.Text.Encoding]::UTF8
[System.IO.File]::WriteAllText("\\nas\share\Movies\My Film (2001)\movie.nfo", $xml, $enc)
```

**Do not** use `Set-Content` for NFO files — it may add a BOM that breaks Jellyfin parsing.

### Paths with brackets in PowerShell

PowerShell treats `[` and `]` as wildcard characters. Always use `-LiteralPath`:

```powershell
Test-Path -LiteralPath "\\nas\share\Movies\Film [1999]\movie.nfo"
Get-Item  -LiteralPath "\\nas\share\Movies\Film [1999]\movie.nfo"
```

### Why not use the Jellyfin API for metadata updates?

`POST /Items/{id}` metadata updates require a **user session token** (obtained from
`/Users/AuthenticateByName`). The API key alone returns HTTP 400. NFO files are the
preferred and more permanent approach — they persist across database rebuilds and
library rescans.

---

## 5. Artwork Files

Jellyfin picks up local artwork images placed alongside the media file. This provides
instant display even before the scrapers run and overrides any scraped artwork.

### Movies

| Filename       | Purpose                  | Recommended size      |
|----------------|--------------------------|-----------------------|
| `poster.jpg`   | Vertical poster          | 1000 × 1500 px        |
| `fanart.jpg`   | Background / backdrop    | 1920 × 1080 px        |
| `logo.png`     | Transparent title logo   | 800 × 310 px (PNG-24) |
| `thumb.jpg`    | Landscape thumb          | 1280 × 720 px         |
| `clearart.png` | Transparent actor/title  | 1000 × 562 px (PNG-24)|
| `disc.png`     | Disc image (optional)    | 1000 × 1000 px        |

### TV Series

Place in the **series root folder**:

```
/TV/Breaking Bad/
  poster.jpg       ← series poster
  fanart.jpg       ← series backdrop
  banner.jpg       ← wide banner (758 × 140 px)
```

Place in each **season folder**:

```
/TV/Breaking Bad/Season 01/
  season01-poster.jpg   ← season poster
```

### Best practices

- Use **JPEG** for photos/artwork, **PNG** for images with transparency.
- Download high-quality artwork from [TheTVDB Fan Art](https://www.thetvdb.com) or
  [The Movie Database](https://www.themoviedb.org).
- Consider the [Fanart.tv](https://fanart.tv) plugin in Jellyfin for automatic artwork
  downloads — it provides HD clearart, logos and disc images unavailable on TMDB.

---

## 6. Subtitles and External Tracks

### External subtitle naming

External subtitles must follow the pattern `MovieTitle.language.ext`:

```
The Matrix (1999).mkv
The Matrix (1999).en.srt        ← English
The Matrix (1999).no.srt        ← Norwegian
The Matrix (1999).en.forced.srt ← Forced English (subtitles for foreign dialogue)
The Matrix (1999).en.sdh.srt    ← English SDH (deaf/hard-of-hearing)
```

### Language codes (ISO 639-1)

| Code | Language   |
|------|------------|
| `en` | English    |
| `no` | Norwegian  |
| `sv` | Swedish    |
| `da` | Danish     |
| `de` | German     |
| `fr` | French     |
| `es` | Spanish    |

### Special subtitle flags

- `.forced` — show only when there is foreign-language dialogue (always-on subtitles).
- `.sdh` / `.cc` — subtitles for the deaf or hard of hearing.
- `.hi` — hearing impaired (equivalent to SDH).

### Subtitle formats

Prefer **SRT** for broad compatibility, **ASS/SSA** for styled/karaoke subtitles,
**PGS** (`.sup`) for bitmap subtitles extracted from Blu-ray.

---

## 7. Extras, Featurettes, and Trailers

Store extras in named sub-folders inside the movie/series folder:

```
/Movies/The Matrix (1999)/
  The Matrix (1999).mkv
  behind the scenes/
    The Matrix - Making of.mkv
  trailers/
    The Matrix - Official Trailer.mkv
  featurettes/
    The Matrix - HBO First Look.mkv
  interviews/
    Keanu Reeves Interview.mkv
  scenes/
    Lobby Scene.mkv
  shorts/
    ...
  deleted scenes/
    Deleted Scenes.mkv
  other/
    ...
```

Jellyfin recognises the following folder names automatically:
`behind the scenes`, `deleted scenes`, `featurettes`, `interviews`, `scenes`,
`shorts`, `trailers`, `other`.

### Local trailers

Alternatively, name a file `<Movie Title> - Trailer.mkv` (or `trailer.mkv`) and place
it in the movie folder — Jellyfin will attach it as the local trailer.

---

## 8. TV Specials (Season 0)

Jellyfin maps specials to **Season 0** (following the TVDB convention).
Store them in a `Season 00` or `Specials` folder:

```
/TV/Breaking Bad/
  Season 00/
    Breaking Bad S00E01 - Inside Breaking Bad.mkv
```

Match the episode numbers to the TVDB listing — the TVDB assigns absolute episode
numbers to each special, and these must be used in the filename.

---

## 9. Anime Naming

Anime is best managed via **absolute episode numbering** combined with a TVDB/AniDB provider:

```
/Anime/Attack on Titan/
  Attack on Titan - 001.mkv    ← absolute episode number
  Attack on Titan - 002.mkv
```

Alternatively use standard season folders if the series has clearly defined seasons:

```
/Anime/Attack on Titan/
  Season 01/
    Attack on Titan S01E01.mkv
```

**Tips:**
- Install the AniDB metadata plugin for best anime identification.
- Prefer TVDB episode ordering for multi-season series (consistent with Jellyfin's
  default TVDB provider).
- For dual-audio files, include the language tag in the version label:
  `Attack on Titan - 001 - Dual Audio.mkv`.

---

## 10. Handling Missing or Unidentified Metadata

### Common causes

- Filename/folder name contains scene-group tokens (e.g. `release-filmname.avi`)
- Raw DVD rip structure (`title00.mkv`) with no context
- Typo in title or year
- Non-English titles that TMDB does not match directly

### Solutions (in priority order)

1. **Rename the file/folder** to `Title (Year).ext` — Jellyfin identifies it automatically.
2. **Create a `.nfo` file** with the correct IMDB/TMDB ID — no rename needed; survives rescans.
3. **Manual match** in the Jellyfin web UI (Edit Metadata → search for the title).

### Finding IMDB/TMDB IDs

- **IMDB:** `tt` + digits, e.g. `tt0133093` — URL: `imdb.com/title/tt0133093/`
- **TMDB movie:** integer, e.g. `603` — URL: `themoviedb.org/movie/603`
- **TMDB series:** integer, e.g. `1396` — URL: `themoviedb.org/tv/1396`
- **TVDB series:** integer — URL: `thetvdb.com/series/…` (shown in the series URL)

---

## 11. Duplicates

### Movies

Jellyfin detects duplicates based on TMDB ID. Two movies with the same TMDB ID in
separate folders appear as two separate library entries.

**Consolidate them by:**
1. Moving both files into one shared folder.
2. Renaming to multi-version convention (`Film (Year) - 1080p.mkv`, `Film (Year) - DVD.mkv`).
3. Triggering a library refresh.

### TV Series

Duplicate series (same series in two folders) must be consolidated into one folder.
Keep the best quality version per episode, then remove the lower-quality copy after
verifying Jellyfin displays the result correctly.

---

## 12. Path Mapping (Linux ↔ Windows)

Jellyfin typically runs on a Linux/NAS host and reports all file paths in Linux format
(`/mnt/…`). When files are accessed from a Windows machine for editing (move/rename),
these paths must be converted to Windows UNC format.

| Linux path       | Windows UNC              |
|------------------|--------------------------|
| `/mnt/disk1/`    | `\\nas\share1\`          |
| `/mnt/disk2/`    | `\\nas\share2\`          |

Mappings are configured via `MOUNT_*` environment variables in the `.env` file:

```env
MOUNT_1_LINUX=/mnt/disk1
MOUNT_1_WINDOWS=\\nas\share1

MOUNT_2_LINUX=/mnt/disk2
MOUNT_2_WINDOWS=\\nas\share2
```

`getMappingsFromEnv()` in `paths.ts` reads all `MOUNT_N_LINUX` / `MOUNT_N_WINDOWS`
pairs automatically — add as many as needed.

---

## 13. Cleanup Workflow

```
1. get_stats                          → overview: movie/series counts, missing metadata, duplicates
2. find_missing_metadata              → find files without TMDB/IMDB ID
3. analyze_duplicates                 → group duplicates, see quality per version
4. find_cd_splits                     → find files not stacking correctly
5. analyze_tv_structure               → full TV audit: duplicates, release-pack names, wrong seasons
6. generate_move_plan tmdb_id=<id>    → preview the rename/move operations for one movie
7. execute_move dry_run=true          → verify path resolution without touching any files
8. execute_move dry_run=false         → execute the move
9. refresh_library                    → Jellyfin picks up all changes
```

### Safety rules

- **Always use `dry_run=true` first** — verify what will happen before any file is moved.
- **Log all operations** — keep a record of what was renamed/moved.
- **Move, don't copy** within the same disk. Copy across disks, verify, then delete the original.
- **Never delete anything** until Jellyfin shows the correct result after a refresh.

---

## 14. MCP Server Tools

| Tool                   | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `get_stats`            | Quick overview: total counts, missing metadata, duplicate groups            |
| `find_missing_metadata`| Movies/series missing TMDB/IMDB ID, grouped by type                        |
| `analyze_duplicates`   | Groups by TMDB ID, classifies quality (2160p/1080p/SD, source, codec)       |
| `find_cd_splits`       | Finds CD-split files not stacking correctly in Jellyfin                     |
| `generate_move_plan`   | Generates move/rename plan for multi-version consolidation                  |
| `execute_move`         | Moves/renames a file with Linux→Windows UNC conversion. `dry_run: true` default |
| `refresh_library`      | Triggers a Jellyfin library rescan after file changes                       |
| `analyze_tv_structure` | Full TV structural audit: duplicates, release-pack names, wrong season numbers |

### Configuration (.env)

```env
JELLYFIN_URL=http://your-jellyfin-server:8096
JELLYFIN_TOKEN=your_api_token_here

# Path mapping: Linux paths (from Jellyfin API) → Windows UNC (for file operations)
MOUNT_1_LINUX=/mnt/disk1
MOUNT_1_WINDOWS=\\nas\share1

MOUNT_2_LINUX=/mnt/disk2
MOUNT_2_WINDOWS=\\nas\share2
```

---

## 15. Library and Performance Best Practices

### Library scanning

- Set **real-time monitoring** to `On` in each library's settings — Jellyfin then detects
  new/moved files immediately without needing a full rescan.
- Reserve full rescans for bulk reorganisations; use `refresh_library` from the MCP
  server or the Dashboard → Libraries panel.
- Split Movies and TV into separate libraries — do not mix content types in one library
  root folder.

### Metadata providers order

Recommended provider priority in Jellyfin's library settings:

| Content type | Provider order                                          |
|--------------|---------------------------------------------------------|
| Movies       | The Movie Database → IMDb → Local NFO                   |
| TV Series    | TheTVDB → The Movie Database → IMDb → Local NFO         |
| Music        | MusicBrainz → TheAudioDB                               |

> **Note:** Local NFO always takes precedence when the file exists, regardless of
> provider order. Use NFO files to lock metadata that scrapers keep getting wrong.

### NFO-first strategy

For collections or media with ambiguous titles, create NFO files **before** adding
items to the library. Jellyfin reads them on first scan and skips the scraper for
those items entirely.

### Scheduled tasks

- **Extract chapter thumbnails**: Run nightly. Skip if hardware acceleration is unavailable.
- **Clean up cache**: Weekly. Keeps database size manageable.
- **Scan media library**: Nightly for libraries without real-time monitoring.

### Hardware acceleration

Enable hardware transcoding (Settings → Playback → Transcoding) for better performance:

| Platform    | Preferred codec           |
|-------------|--------------------------|
| Intel CPU   | Intel Quick Sync (QSV)   |
| NVIDIA GPU  | NVENC/NVDEC              |
| AMD GPU     | AMF                      |
| Raspberry Pi| V4L2 (limited support)   |
| Docker/NAS  | VAAPI                    |

Prefer formats that do **not** require transcoding: H.264 / H.265 in an MKV or MP4
container with AAC or AC3 audio covers most client devices.

### Remote access

- Use HTTPS with a valid TLS certificate for external access (Let's Encrypt via a
  reverse proxy is the standard approach).
- Do **not** expose Jellyfin directly on port 8096 to the internet — put it behind
  Nginx or Caddy.
- For VPN-based setups (Tailscale/WireGuard), use the internal IP; no public exposure
  is needed.

### Backup

Back up the following to preserve metadata and configuration:

| Path (relative to Jellyfin data dir) | Contains                              |
|---------------------------------------|---------------------------------------|
| `config/`                             | Server configuration XML files        |
| `data/library.db`                     | Full library metadata database        |
| `data/jellyfin.db`                    | Users, playback state, ratings        |
| `metadata/`                           | Downloaded artwork and metadata cache |

NFO files stored alongside the media act as a secondary metadata backup — they allow
a full database rebuild without losing any curated metadata.

### Plugins worth considering

| Plugin             | Purpose                                           |
|--------------------|---------------------------------------------------|
| Fanart.tv          | HD logos, clearart, disc images                   |
| Open Subtitles     | Automatic subtitle download                       |
| Merge Versions     | Merges duplicate library entries into one item    |
| Playback Reporting | Detailed watch statistics                         |
| Intro Skipper      | Detects and skips intros automatically            |
