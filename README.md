# TikTok Likes & Saves Search

Search your TikTok liked and saved videos using your personal data export.

## How it works

1. **Request** — opens a browser, logs you into TikTok, and submits a data export request
2. **Download** — once TikTok prepares your export (hours to days), downloads the zip file
3. **Parse** — extracts and normalizes liked/saved video data from the export into `data/videos.json`
4. **Serve** — starts a local web UI to search and browse your videos

## Setup

```bash
npm install
cp config.example.json config.json
```

Edit `config.json` with your TikTok username and preferred paths:

```json
{
  "tiktok": {
    "username": "your_tiktok_username"
  },
  "server": {
    "port": 3000
  },
  "paths": {
    "dataDir": "./data",
    "downloadDir": "./data/raw",
    "sessionFile": "./data/session/tiktok-auth.json"
  }
}
```

## Usage

### Step 1 — Request your data export

```bash
npm run request
```

A browser window will open. Log into TikTok if prompted (your session is saved for future runs). The script navigates to Settings > Privacy > Download your data, selects JSON format, and submits the request.

TikTok will email you when your export is ready — usually within a few hours, sometimes up to a few days.

### Step 2 — Download the export

```bash
npm run download
```

Opens a browser, navigates to the download page, and saves the zip to `data/raw/tiktok-export.zip`. Automatically runs the parse step on success.

### Step 3 — Parse (if needed separately)

```bash
npm run parse
```

Unzips the export and normalizes liked and saved videos into `data/videos.json`.

### Step 4 — Search

```bash
npm run serve
```

Opens a local server at `http://localhost:3000`. Search by creator handle, URL, or date. Filter by liked, saved, or both.

## Data

All data stays local. The parsed output is a JSON array at `data/videos.json` with entries like:

```json
{
  "id": "7123456789012345678",
  "url": "https://www.tiktok.com/@creator/video/7123456789012345678",
  "creator": "@creator",
  "date": "2024-01-15T00:00:00.000Z",
  "source": "liked"
}
```

`source` is one of `"liked"`, `"saved"`, or `"both"`.

## Requirements

- Node.js 18+
- A TikTok account
