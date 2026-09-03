/**
 * Central registry of every supported platform for btch-downloader.
 * `fn`        → the exported function name inside the `btch-downloader` package
 * `queryType` → "url" | "query" | "url_or_query"
 * `example`   → sample input shown in API docs
 */
export interface PlatformConfig {
  fn: string;
  queryType: "url" | "query" | "url_or_query";
  example: string;
  note?: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  aio: {
    fn: "aio",
    queryType: "url",
    example: "https://www.tiktok.com/@user/video/1234567890",
    note: "Auto-detects the platform from the URL and delegates to the matching downloader.",
  },
  tiktok:      { fn: "ttdl",       queryType: "url",          example: "https://www.tiktok.com/@user/video/1234567890" },
  instagram:   { fn: "igdl",       queryType: "url",          example: "https://www.instagram.com/reel/xxxxxxxxxxx/" },
  facebook:    { fn: "fbdown",     queryType: "url",          example: "https://www.facebook.com/watch/?v=1234567890" },
  twitter:     { fn: "twitter",    queryType: "url",          example: "https://twitter.com/user/status/1234567890" },
  youtube:     { fn: "youtube",    queryType: "url",          example: "https://youtu.be/xxxxxxxxxxx" },
  "youtube-search": { fn: "yts",  queryType: "query",        example: "Somewhere Only We Know" },
  spotify:     { fn: "spotify",    queryType: "url",          example: "https://open.spotify.com/track/xxxxxx" },
  soundcloud:  { fn: "soundcloud", queryType: "url",          example: "https://soundcloud.com/artist/track-name" },
  pinterest:   { fn: "pinterest",  queryType: "url_or_query", example: "https://pin.it/xxxxxxx (or a search term)" },
  mediafire:   { fn: "mediafire",  queryType: "url",          example: "https://www.mediafire.com/file/xxx/name/file" },
  gdrive:      { fn: "gdrive",     queryType: "url",          example: "https://drive.google.com/file/d/xxx/view" },
  capcut:      { fn: "capcut",     queryType: "url",          example: "https://www.capcut.com/template-detail/xxx" },
  douyin:      { fn: "douyin",     queryType: "url",          example: "https://v.douyin.com/xxxxxxx/" },
  xiaohongshu: { fn: "xiaohongshu",queryType: "url",          example: "https://xhslink.com/o/xxxxxxxxxxx" },
  snackvideo:  { fn: "snackvideo", queryType: "url",          example: "https://s.snackvideo.com/p/xxxxxxxx" },
  cocofun:     { fn: "cocofun",    queryType: "url",          example: "https://www.icocofun.com/share/post/xxx" },
};
