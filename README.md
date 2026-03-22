# jellyfin-mcp

MCP (Model Context Protocol) server for Jellyfin media library management.
Lets you ask GitHub Copilot to analyze duplicates, fix CD-splits, find unidentified files,
and reorganize your library — all via natural language.

## Tools

| Tool | Description |
|------|-------------|
| `get_stats` | Quick health overview: total counts, missing metadata, duplicate groups |
| `find_missing_metadata` | Find movies/series missing TMDB and/or IMDB identifiers |
| `analyze_duplicates` | Group by TMDB ID, classify quality per version (2160p/1080p/SD, Bluray/WEB/DVD) |
| `find_cd_splits` | Find CD-split files not stacking correctly in Jellyfin |
| `generate_move_plan` | Generate rename/move plan for multi-version consolidation |
| `execute_move` | Move or rename a file (Linux path → Windows UNC auto-convert). Use `dry_run: true` first |
| `refresh_library` | Trigger a full Jellyfin library rescan |

## Setup

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```env
JELLYFIN_URL=http://your-jellyfin-server:8096
JELLYFIN_TOKEN=your_api_token

MOUNT_1_LINUX=/mnt/usb1
MOUNT_1_WINDOWS=\\your-nas\share
```

To find your API token: Jellyfin → Dashboard → API Keys.

### 3. Connect to VS Code Copilot

The `.vscode/mcp.json` file is already configured for this workspace.
Open VS Code, start a Copilot chat in Agent mode, and the `jellyfin` MCP server will be available.

## Typical workflow

```
1. get_stats                           → overview of library health
2. find_missing_metadata               → find files without TMDB/IMDB
3. analyze_duplicates sort_by=count    → movies with the most duplicate versions
4. generate_move_plan tmdb_id=<id>     → preview renames for one movie
5. execute_move dry_run=true           → verify a single operation
6. execute_move dry_run=false          → execute
7. refresh_library                     → Jellyfin picks up the changes
```

## Path mapping

Jellyfin runs on Linux and reports paths like `/mnt/usb1/Filmer/...`.
The server automatically converts these to Windows UNC paths for file operations
using the `MOUNT_*` environment variables. Add one pair per mount point:

```env
MOUNT_1_LINUX=/mnt/usb1
MOUNT_1_WINDOWS=\\nas\share1

MOUNT_2_LINUX=/mnt/video
MOUNT_2_WINDOWS=\\nas\video
```

## Project structure

```
src/
  index.ts       MCP server — tool definitions and handlers
  jellyfin.ts    Jellyfin REST API client
  paths.ts       Linux ↔ Windows UNC path conversion
  quality.ts     Video quality classification from filename
dist/            Compiled JavaScript
docs/
  STRATEGI-MEDIEFILER.md   Media organization strategy (Norwegian)
.vscode/
  mcp.json       VS Code Copilot MCP server configuration
.env.example     Environment variable template
```

## Development

```bash
npm run dev     # Run with tsx (no build step)
npm run build   # Compile to dist/
```
