export interface Video {
  id: string;
  url: string;
  creator: string;
  date: string;
  source: "liked" | "saved" | "both";
}

export interface ExportStatus {
  status: "requested" | "downloaded" | "parsed";
  requestedAt?: string;
  downloadedAt?: string;
  parsedAt?: string;
}

export interface Config {
  tiktok: {
    username: string;
  };
  server: {
    port: number;
  };
  paths: {
    dataDir: string;
    downloadDir: string;
    sessionFile: string;
  };
}
