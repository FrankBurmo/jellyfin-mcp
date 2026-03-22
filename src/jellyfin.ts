import http from "node:http";
import https from "node:https";

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: "Movie" | "Series" | "Season" | "Episode" | string;
  Path?: string;
  ProviderIds?: {
    Imdb?: string;
    Tmdb?: string;
    TmdbCollection?: string;
    Tvdb?: string;
  };
  MediaSources?: Array<{
    Path: string;
    Size?: number;
    Container?: string;
  }>;
  // Season / Episode fields
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  /** Season number (on Season items) or episode number (on Episode items) */
  IndexNumber?: number;
  /** Season number on Episode items */
  ParentIndexNumber?: number;
}

export interface ItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

export class JellyfinClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async getItems(params: Record<string, string>): Promise<ItemsResponse> {
    const query = new URLSearchParams({
      ...params,
      api_key: this.token,
      Limit: params.Limit ?? "5000",
    });
    return this.get<ItemsResponse>(`${this.baseUrl}/Items?${query}`);
  }

  async refreshLibrary(): Promise<void> {
    await this.post(`${this.baseUrl}/Library/Refresh`);
  }

  private get<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith("https") ? https : http;
      mod
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk: string) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
            }
          });
        })
        .on("error", reject);
    });
  }

  private post(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const u = new URL(`${url}?api_key=${this.token}`);
      const options = {
        hostname: u.hostname,
        port: parseInt(u.port) || (url.startsWith("https") ? 443 : 80),
        path: u.pathname + u.search,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": "0" },
      };
      const mod = url.startsWith("https") ? https : http;
      const req = mod.request(options, (res) => {
        res.resume();
        res.on("end", resolve);
      });
      req.on("error", reject);
      req.end();
    });
  }
}
