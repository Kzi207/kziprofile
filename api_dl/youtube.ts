import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";
import { spawn } from "child_process";
import crypto from "crypto";
import { Request, Response } from "express";
import ytdl from "@distube/ytdl-core";
import { withTimeout } from "./utils/withTimeout.js";

Log.setLevel(Log.Level.NONE);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getBaseUrl(req: Request): string {
  const host = req.get("host") || "localhost:3000";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const finalProto = (host.includes("vercel.app") || Boolean(process.env.VERCEL)) ? "https" : proto;
  return `${finalProto}://${host}`;
}

const SECRET_KEY = process.env.DOWNLOAD_SECRET_KEY || "media_dl_secret_15m";

export function generateToken(id: string, expires: number): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(`${id}:${expires}`).digest("hex").slice(0, 16);
}

export function validateToken(id: string, req: Request, res: Response): boolean {
  const { expires, token } = req.query;
  if (expires || token) {
    const expNum = Number(expires);
    if (!expNum || isNaN(expNum) || Date.now() > expNum) {
      res.status(410).json({ status: false, message: "Link đã hết hạn. Vui lòng gọi API để lấy link mới." });
      return false;
    }
    if (token !== generateToken(id, expNum)) {
      res.status(403).json({ status: false, message: "Token không hợp lệ." });
      return false;
    }
  }
  return true;
}

export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const str = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function normalizeYouTubeUrl(input: string): string {
  let v = String(input || "").trim();
  v = v.replace(/^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&/]+).*$/i, "https://www.youtube.com/watch?v=$1");
  v = v.replace(/^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?&/]+).*$/i, "https://www.youtube.com/watch?v=$1");
  return v;
}

export function cleanName(name: string): string {
  return (name || "").replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string; title: string; artist: string;
  duration: string; duration_seconds?: number;
  thumbnail: string; url: string;
}

export interface SearchResult {
  status: boolean; type: string; query: string;
  total: number; data: MediaItem[]; message?: string;
}

export interface DownloadInfoResult {
  status: boolean; id?: string; title?: string; author?: string;
  duration?: string; thumbnail?: string; type?: string;
  expires_in?: string; expires_at?: string;
  stream_url?: string; download_url?: string; message?: string;
}

export interface YouTubeMetadata {
  title: string; author: string; duration: number; thumbnail: string;
}

// ─── Youtubei.js singleton ────────────────────────────────────────────────────

let ytInstance: Innertube | null = null;
let ytInitPromise: Promise<Innertube> | null = null;

export async function getYT(): Promise<Innertube> {
  if (ytInstance) return ytInstance;
  if (ytInitPromise) return ytInitPromise;
  ytInitPromise = (async () => {
    try {
      ytInstance = await Innertube.create({ location: "VN", retrieve_player: true });
      return ytInstance;
    } catch (err) { ytInitPromise = null; throw err; }
  })();
  return ytInitPromise;
}

// ─── Piped API fallback ───────────────────────────────────────────────────────

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://piped-api.garudalinux.org",
  "https://api.piped.projectsegfau.lt",
];

export async function getPipedStreamUrl(videoId: string, wantVideo: boolean): Promise<{ streamUrl: string; mimeType: string } | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${instance}/streams/${videoId}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json() as any;
      if (wantVideo) {
        const muxed = (data.videoStreams || []).find((s: any) => !s.videoOnly && s.mimeType?.startsWith("video/mp4"));
        if (muxed?.url) return { streamUrl: muxed.url, mimeType: muxed.mimeType };
        const best = (data.videoStreams || []).filter((s: any) => s.mimeType?.startsWith("video/mp4")).sort((a: any, b: any) => (b.quality || 0) - (a.quality || 0))[0];
        if (best?.url) return { streamUrl: best.url, mimeType: best.mimeType };
      } else {
        const audio = (data.audioStreams || []).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (audio?.url) return { streamUrl: audio.url, mimeType: audio.mimeType || "audio/webm" };
      }
    } catch (err: any) {
      console.warn(`[Piped] ${instance} failed: ${err.message}`);
    }
  }
  return null;
}

// ─── FFmpeg check ─────────────────────────────────────────────────────────────

let ffmpegAvailable: boolean | null = null;
async function isFFmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  return new Promise((resolve) => {
    try {
      const proc = spawn("ffmpeg", ["-version"]);
      proc.on("error", () => { ffmpegAvailable = false; resolve(false); });
      proc.on("close", (code) => { ffmpegAvailable = code === 0; resolve(ffmpegAvailable!); });
    } catch { ffmpegAvailable = false; resolve(false); }
  });
}

// ─── YouTube Metadata ─────────────────────────────────────────────────────────

export async function getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  // Try yt-dlp first (most reliable)
  try {
    const meta = await withTimeout<YouTubeMetadata>(
      new Promise((resolve, reject) => {
        const proc = spawn("yt-dlp", [
          "--no-playlist", "--print", "%(title)s\n%(uploader)s\n%(duration)s\n%(thumbnail)s",
          "--no-warnings", "--quiet",
          `https://www.youtube.com/watch?v=${videoId}`
        ]);
        let out = "";
        proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
        proc.on("close", (code) => {
          if (code !== 0 || !out.trim()) return reject(new Error("yt-dlp metadata failed"));
          const lines = out.trim().split("\n");
          resolve({
            title: lines[0] || "YouTube Media",
            author: lines[1] || "YouTube Artist",
            duration: parseInt(lines[2] || "0") || 0,
            thumbnail: lines[3] || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          });
        });
        proc.on("error", reject);
      }),
      8000, "yt-dlp metadata timeout"
    );
    return meta;
  } catch (err: any) {
    console.warn(`[Metadata] yt-dlp failed: ${err.message}`);
  }

  // Try youtubei.js
  try {
    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId);
    if (info?.basic_info?.title) {
      const thumbnails = info.basic_info.thumbnail || [];
      return {
        title: info.basic_info.title,
        author: info.basic_info.author || "YouTube Artist",
        duration: info.basic_info.duration || 0,
        thumbnail: thumbnails.length ? thumbnails[thumbnails.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  } catch (err: any) {
    console.warn(`[Metadata] youtubei.js failed: ${err.message}`);
  }

  // oEmbed fallback
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json() as any;
      return {
        title: data.title || "YouTube Media",
        author: data.author_name || "YouTube Artist",
        duration: 0,
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  } catch {}

  return { title: "YouTube Media", author: "YouTube Artist", duration: 0, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
}

// ─── YouTube Search ───────────────────────────────────────────────────────────

export async function searchYouTube(query?: string): Promise<SearchResult> {
  const isHome = !query || typeof query !== "string" || query.trim() === "" || query.trim().toLowerCase() === "home";
  const searchTerm = isHome ? "Vpop Music Video Official 2026 bài hát thịnh hành" : query.trim();

  // Try yt-dlp ytsearch
  try {
    const results = await withTimeout<MediaItem[]>(
      new Promise((resolve, reject) => {
        const proc = spawn("yt-dlp", [
          `ytsearch15:${searchTerm}`,
          "--no-playlist", "--print",
          "%(id)s\t%(title)s\t%(uploader)s\t%(duration)s\t%(thumbnail)s",
          "--no-warnings", "--quiet", "--flat-playlist"
        ]);
        let out = "";
        proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
        proc.on("close", (code) => {
          if (code !== 0 || !out.trim()) return reject(new Error("yt-dlp search failed"));
          const items: MediaItem[] = out.trim().split("\n").filter(Boolean).map((line) => {
            const [id, title, artist, dur, thumbnail] = line.split("\t");
            return { id, title, artist, duration: formatDuration(parseInt(dur) || 0), duration_seconds: parseInt(dur) || 0, thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, url: `https://youtu.be/${id}` };
          });
          resolve(items);
        });
        proc.on("error", reject);
      }),
      12000, "yt-dlp search timeout"
    );
    let videos = results;
    if (isHome) {
      const valid = videos.filter(v => (v.duration_seconds || 0) >= 120 && (v.duration_seconds || 0) <= 600);
      const other = videos.filter(v => (v.duration_seconds || 0) < 120 || (v.duration_seconds || 0) > 600);
      videos = [...valid, ...other];
    }
    return { status: true, type: isHome ? "home" : "search", query: searchTerm, total: videos.length, data: videos.map(({ duration_seconds, ...rest }) => rest) };
  } catch (err: any) {
    console.warn(`[Search] yt-dlp failed: ${err.message}`);
  }

  // Fallback: youtubei.js
  try {
    const yt = await getYT();
    const searchRes = await yt.search(searchTerm, { type: "video" });
    let videos: MediaItem[] = (searchRes.videos as any[] || []).map((item: any) => {
      const sec = item.duration?.seconds || 0;
      const thumbs = item.thumbnails || [];
      return { id: item.id || "", title: item.title?.text || item.title || "", artist: item.author?.name || "", duration: item.duration?.text || formatDuration(sec), duration_seconds: sec, thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : "", url: `https://youtu.be/${item.id}` };
    });
    if (isHome) {
      const valid = videos.filter(v => (v.duration_seconds || 0) >= 120 && (v.duration_seconds || 0) <= 600);
      videos = [...valid, ...videos.filter(v => !valid.includes(v))];
    }
    return { status: true, type: isHome ? "home" : "search", query: searchTerm, total: videos.length, data: videos.map(({ duration_seconds, ...rest }) => rest) };
  } catch (err: any) {
    return { status: false, type: "error", query: query || "", total: 0, message: "Lỗi tìm kiếm: " + err.message, data: [] };
  }
}

// ─── yt-dlp -g: get direct CDN URL (supports browser Range/seek natively) ─────

export async function getYtDlpDirectUrl(videoId: string, format: "audio" | "video" | "both" = "audio"): Promise<{ audioUrl?: string; videoUrl?: string }> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const run = (fmt: string): Promise<string | null> => new Promise((resolve) => {
    const proc = spawn("yt-dlp", ["-g", "-f", fmt, "--no-playlist", "--no-warnings", ytUrl]);
    let out = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.on("close", (code) => resolve(code === 0 && out.trim() ? out.trim().split("\n")[0].trim() : null));
    proc.on("error", () => resolve(null));
    setTimeout(() => { try { proc.kill(); } catch {} resolve(null); }, 10000);
  });

  if (format === "audio") {
    const audioUrl = await run("bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio") ?? undefined;
    return { audioUrl };
  }
  if (format === "video") {
    // Combined stream up to 720p (single file, browser-compatible)
    const videoUrl = await run("best[ext=mp4][height<=720]/best[ext=mp4]/best") ?? undefined;
    return { videoUrl };
  }
  // Both
  const [audioUrl, videoUrl] = await Promise.all([
    run("bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio"),
    run("best[ext=mp4][height<=720]/best[ext=mp4]/best"),
  ]);
  return { audioUrl: audioUrl ?? undefined, videoUrl: videoUrl ?? undefined };
}

// ─── YouTube Play Info (for inline browser playback) ─────────────────────────

export async function getYouTubePlayInfo(req: Request, input: string): Promise<object> {
  const videoId = extractVideoId(input);
  if (!videoId) return { status: false, message: "Không tìm thấy Video ID hợp lệ." };

  try {
    const [meta, urls] = await Promise.all([
      getYouTubeMetadata(videoId),
      getYtDlpDirectUrl(videoId, "both"),
    ]);
    const baseUrl = getBaseUrl(req);
    const expires = Date.now() + 60 * 60 * 1000; // 1 giờ
    const token = generateToken(videoId, expires);

    return {
      status: true,
      id: videoId,
      title: meta.title,
      author: meta.author,
      duration: formatDuration(meta.duration),
      duration_seconds: meta.duration,
      thumbnail: meta.thumbnail,
      // Direct CDN URLs — browser có thể seek/tua tự nhiên
      audio_url: urls.audioUrl || null,
      video_url: urls.videoUrl || null,
      // Fallback stream qua server (không seek được nhưng ổn định hơn)
      stream_audio: `${baseUrl}/api/v1/youtube/stream/${videoId}.mp3?expires=${expires}&token=${token}&dl=1`,
      stream_video: `${baseUrl}/api/v1/youtube/stream/${videoId}.mp4?expires=${expires}&token=${token}&dl=1`,
      download_audio: `${baseUrl}/api/v1/youtube/stream/${videoId}.mp3?expires=${expires}&token=${token}&dl=2`,
      download_video: `${baseUrl}/api/v1/youtube/stream/${videoId}.mp4?expires=${expires}&token=${token}&dl=2`,
      player_url: `${baseUrl}/api/v1/youtube/player?url=https://youtu.be/${videoId}`,
    };
  } catch (err: any) {
    return { status: false, message: "Lỗi lấy thông tin phát: " + err.message };
  }
}

// ─── YouTube Download Info ────────────────────────────────────────────────────

export async function getYouTubeDownloadInfo(req: Request, input: string, formatType = "mp3"): Promise<DownloadInfoResult> {
  try {
    const videoId = extractVideoId(input);
    if (!videoId) return { status: false, message: "Không tìm thấy Video ID hợp lệ." };
    const meta = await getYouTubeMetadata(videoId);
    const type = formatType.toLowerCase() === "mp4" ? "mp4" : "mp3";
    const baseUrl = getBaseUrl(req);
    const expires = Date.now() + 15 * 60 * 1000;
    const token = generateToken(videoId, expires);
    return {
      status: true, id: videoId, title: meta.title, author: meta.author,
      duration: formatDuration(meta.duration), thumbnail: meta.thumbnail, type,
      expires_in: "15 phút", expires_at: new Date(expires).toISOString(),
      stream_url: `${baseUrl}/api/v1/youtube/stream/${videoId}.${type}?expires=${expires}&token=${token}&dl=1`,
      download_url: `${baseUrl}/api/v1/youtube/stream/${videoId}.${type}?expires=${expires}&token=${token}&dl=2`,
    };
  } catch (err: any) {
    return { status: false, message: "Không thể lấy thông tin video: " + err.message };
  }
}

// ─── yt-dlp stream (Method 1 — best for long videos) ─────────────────────────

async function streamViaYtDlp(videoId: string, isMp4: boolean, res: Response, dispositionMode: string, asciiTitle: string, encodedTitle: string): Promise<boolean> {
  const ext = isMp4 ? "mp4" : "mp3";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return new Promise((resolve) => {
    const ytdlpArgs = [
      "--no-playlist", "--no-warnings",
      isMp4
        ? "-f" : "-f",
      isMp4
        ? "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"
        : "bestaudio[ext=m4a]/bestaudio/best",
      "-o", "-",
    ];
    if (!isMp4) {
      // Extract audio only
      ytdlpArgs.splice(-2, 0, "--extract-audio", "--audio-format", "mp3", "--audio-quality", "192K");
    }
    ytdlpArgs.push(url);

    const proc = spawn("yt-dlp", ytdlpArgs);
    let headersSent = false;

    proc.stdout.once("data", (chunk: Buffer) => {
      if (!res.headersSent) {
        headersSent = true;
        res.setHeader("Content-Type", isMp4 ? "video/mp4" : "audio/mpeg");
        res.setHeader("Content-Disposition", `${dispositionMode}; filename="${asciiTitle}.${ext}"; filename*=UTF-8''${encodedTitle}.${ext}`);
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.write(chunk);
      }
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      if (headersSent && !res.writableEnded) res.write(chunk);
    });

    proc.stdout.on("end", () => {
      if (headersSent && !res.writableEnded) res.end();
      resolve(true);
    });

    proc.on("error", (err) => {
      console.warn(`[yt-dlp stream] error: ${err.message}`);
      resolve(false);
    });

    proc.stderr.on("data", (d: Buffer) => {
      const msg = d.toString();
      if (msg.includes("ERROR")) console.warn("[yt-dlp stderr]", msg.slice(0, 200));
    });

    proc.on("close", (code) => {
      if (!headersSent) resolve(false);
    });

    res.on("close", () => {
      try { proc.kill("SIGTERM"); } catch {}
    });
  });
}

// ─── ytdl-core stream (Method 2 — fallback) ──────────────────────────────────

async function streamViaYtdlCore(videoId: string, isMp4: boolean, req: Request, res: Response, dispositionMode: string, asciiTitle: string, encodedTitle: string): Promise<boolean> {
  const ext = isMp4 ? "mp4" : "mp3";
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    if (!ytdl.validateURL(url)) return false;

    const info = await ytdl.getInfo(url);
    const format = isMp4
      ? ytdl.chooseFormat(info.formats, { quality: "highestvideo", filter: "videoandaudio" })
      : ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });

    if (!format) return false;

    const contentLength = format.contentLength ? parseInt(format.contentLength) : null;
    const range = req.headers.range;
    let start = 0;
    let end = contentLength ? contentLength - 1 : undefined;

    if (range && contentLength) {
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10) || 0;
      end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${contentLength}`);
      res.setHeader("Content-Length", (end! - start + 1).toString());
    } else {
      res.status(200);
      if (contentLength) res.setHeader("Content-Length", contentLength.toString());
    }

    res.setHeader("Content-Type", isMp4 ? "video/mp4" : "audio/mpeg");
    res.setHeader("Content-Disposition", `${dispositionMode}; filename="${asciiTitle}.${ext}"; filename*=UTF-8''${encodedTitle}.${ext}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = ytdl.downloadFromInfo(info, {
      format,
      ...(range && contentLength ? { range: { start, end: end! } } : {}),
    });

    return new Promise((resolve) => {
      stream.pipe(res);
      stream.on("end", () => resolve(true));
      stream.on("error", (err) => { console.warn("[ytdl-core] error:", err.message); resolve(false); });
      res.on("close", () => { try { stream.destroy(); } catch {} });
    });
  } catch (err: any) {
    console.warn(`[ytdl-core] failed: ${err.message}`);
    return false;
  }
}

// ─── youtubei.js stream (Method 3) ───────────────────────────────────────────

async function streamViaYoutubei(videoId: string, isMp4: boolean, res: Response, dispositionMode: string, asciiTitle: string, encodedTitle: string): Promise<boolean> {
  const ext = isMp4 ? "mp4" : "mp3";
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED"] as const;
  try {
    const yt = await getYT();
    let downloadStream: any = null;
    for (const client of clients) {
      try {
        downloadStream = await yt.download(videoId, { client, quality: "best", type: isMp4 ? "video+audio" : "audio" });
        break;
      } catch (e: any) {
        console.warn(`[youtubei] client ${client} failed: ${e.message}`);
      }
    }
    if (!downloadStream) return false;

    const reader = (downloadStream as any).getReader();
    const { done, value: firstChunk } = await reader.read();
    if (done || !firstChunk?.length) return false;

    res.setHeader("Content-Type", isMp4 ? "video/mp4" : "audio/mpeg");
    res.setHeader("Content-Disposition", `${dispositionMode}; filename="${asciiTitle}.${ext}"; filename*=UTF-8''${encodedTitle}.${ext}`);
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200);
    res.write(firstChunk);

    const readable = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) this.push(null);
          else this.push(value);
        } catch (err) { this.destroy(err as Error); }
      }
    });

    const hasFFmpeg = await isFFmpegAvailable();
    if (isMp4 || !hasFFmpeg) {
      readable.pipe(res);
      res.on("close", () => { try { readable.destroy(); } catch {} });
    } else {
      const ff = spawn("ffmpeg", ["-fflags", "+genpts+discardcorrupt", "-i", "pipe:0", "-vn", "-acodec", "libmp3lame", "-ab", "192k", "-ar", "44100", "-f", "mp3", "pipe:1"]);
      ff.stdin.on("error", () => {});
      ff.stdout.on("error", () => {});
      readable.pipe(ff.stdin);
      ff.stdout.pipe(res);
      res.on("close", () => { try { readable.destroy(); ff.kill(); } catch {} });
    }
    return true;
  } catch (err: any) {
    console.warn(`[youtubei] stream failed: ${err.message}`);
    return false;
  }
}

// ─── streamYouTubeMedia (main export) ─────────────────────────────────────────

export async function streamYouTubeMedia(req: Request, res: Response, input: string, formatType = "mp3"): Promise<void> {
  const videoId = extractVideoId(input);
  if (!videoId) {
    res.status(400).json({ status: false, message: "Link hoặc Video ID YouTube không hợp lệ." });
    return;
  }
  if (!validateToken(videoId, req, res)) return;

  const isMp4 = formatType.toLowerCase() === "mp4";
  const ext = isMp4 ? "mp4" : "mp3";
  const meta = await getYouTubeMetadata(videoId);
  const title = cleanName(meta.title || "youtube_media");
  const asciiTitle = title.replace(/[^\x00-\x7F]/g, "_");
  const encodedTitle = encodeURIComponent(title);

  const dlVal = String(req.query.dl || "").trim();
  const isDownload = ["2", "3", "true", "attachment"].includes(dlVal) || req.query.download === "1";
  const dispositionMode = isDownload ? "attachment" : "inline";

  console.log(`[YouTube] 🚀 videoId=${videoId} format=${ext}`);

  // Method 1: yt-dlp (best for long videos, no JS deciphering issues)
  console.log("[YouTube] Trying yt-dlp...");
  const ok1 = await streamViaYtDlp(videoId, isMp4, res, dispositionMode, asciiTitle, encodedTitle);
  if (ok1) { console.log("[YouTube] ✅ yt-dlp succeeded"); return; }

  if (res.headersSent) return;

  // Method 2: @distube/ytdl-core (supports range requests, good for long videos)
  console.log("[YouTube] Trying @distube/ytdl-core...");
  const ok2 = await streamViaYtdlCore(videoId, isMp4, req, res, dispositionMode, asciiTitle, encodedTitle);
  if (ok2) { console.log("[YouTube] ✅ ytdl-core succeeded"); return; }

  if (res.headersSent) return;

  // Method 3: youtubei.js (multi-client fallback)
  console.log("[YouTube] Trying youtubei.js...");
  const ok3 = await streamViaYoutubei(videoId, isMp4, res, dispositionMode, asciiTitle, encodedTitle);
  if (ok3) { console.log("[YouTube] ✅ youtubei.js succeeded"); return; }

  if (res.headersSent) return;

  // Method 4: Piped API redirect
  console.log("[YouTube] Trying Piped API redirect...");
  try {
    const piped = await getPipedStreamUrl(videoId, isMp4);
    if (piped?.streamUrl) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.redirect(302, piped.streamUrl);
      return;
    }
  } catch {}

  res.status(502).json({
    status: false,
    message: `Không thể stream YouTube ${ext.toUpperCase()} videoId=${videoId}. Đã thử: yt-dlp, ytdl-core, youtubei.js, Piped API.`,
  });
}
