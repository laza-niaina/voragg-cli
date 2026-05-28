# voragg-cli

Download anime episodes from streaming sites via the command line.

## Features

- **Episode discovery** — Scrapes series pages to find all episode URLs
- **Player extraction** — Extracts video URLs from supported players (Streamtape, Vidmoly)
- **Resumable downloads** — Partial files continue where they left off
- **Smart skipping** — Already-completed files are detected and skipped
- **Retry logic** — Up to 3 retries on failure
- **Concurrent downloads** — Configurable parallel downloads
- **Progress bars** — Per-file and overall download progress

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/laza-niaina/voragg-cli.git
cd voragg-cli
npm install
```

You can then run it directly:

```bash
node src/index.js <url> [options]
```

Or install it globally to use the `voragg` command from anywhere:

```bash
npm link
voragg <url> [options]
```

## CLI reference

### Usage

```
voragg <url> [options]
node src/index.js <url> [options]
```

### Arguments

| Argument | Description |
| -------- | ----------- |
| `url`    | URL to an anime series page or individual episode |

### Options

| Option                    | Default     | Description |
| ------------------------- | ----------- | ----------- |
| `-o, --output <dir>`      | `.`         | Output directory for downloaded files |
| `-s, --start <number>`    | prompt      | Starting episode number |
| `-p, --process <number>`  | `3`         | Max concurrent downloads |
| `--player <name>`         | `streamtape` | Video player to use (`streamtape`, `vidmoly`) |
| `-q, --quality <label>`   | best        | Video quality (e.g. `480`, `720`, `1080`) |
| `--debug`                 | off         | Enable debug logging |
| `-h, --help`              |             | Show help |

### Examples

Download all episodes from a series (interactively choose start episode):

```
voragg https://voiranime.com/anime/shingeki-no-kyojin/
```

Download from episode 5 onwards to a specific folder:

```
voragg https://voiranime.com/anime/shingeki-no-kyojin/ -s 5 -o ./downloads
```

Download a single episode:

```
voragg https://voiranime.com/anime/shingeki-no-kyojin/shingeki-no-kyojin-25/
```

Download with 5 concurrent downloads:

```
voragg https://voiranime.com/anime/shingeki-no-kyojin/ -p 5
```

## How it works

1. **Episode discovery** — Scrapes the series page to find all episode URLs
2. **Player extraction** — Visits each episode page to locate the video iframe (e.g., Streamtape)
3. **Direct URL resolution** — Extracts the direct video file URL from the player page
4. **Download** — Downloads each episode with resumable downloads, skip detection, retry logic, progress bars, and concurrent downloads

### Pipeline

```
Series URL → Episode list → Player URL → Direct video URL → Download
```

## Supported platforms

| Platform | Episodes | Players |
| -------- | -------- | ------- |
| [voiranime.com](https://voiranime.com) | ✅ | Streamtape, Vidmoly |

## Requirements

- Node.js 18+

## License

MIT — see the [LICENSE](LICENSE) file for details.
