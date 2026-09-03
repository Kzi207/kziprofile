import { spawn } from "child_process";
import { existsSync, mkdirSync, statSync, readdirSync, unlinkSync, createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import { Request, Response } from "express";
import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

// ─── Environment Detection ────────────────────────────────────────────────────
const IS_VERCEL = Boolean(process.env.VERCEL) || (process.env.VERCEL_ENV !== undefined);
const IS_SERVERLESS = IS_VERCEL;

// ─── Config ────────────────────────────────────────────────────────────────────
// Trên Vercel: dùng /tmp (writable), local: dùng ./cache
const CACHE_DIR = IS_SERVERLESS
  ? "/tmp/media_cache"
  : path.join(process.cwd(), "api_dl", "cache");
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_MB = IS_SERVERLESS ? 400 : 2048; // /tmp giới hạn 512MB trên Lambda
const LINK_EXPIRES_MS = 15 * 60 * 1000;
const SECRET_KEY = process.env.DOWNLOAD_SECRET_KEY || "media_dl_secret_15m";

// Lazy init cache dir (chỉ tạo khi thực sự cần, không gọi khi module load)
let cacheDirReady = false;
function ensureCacheDir() {
  if (cacheDirReady) return;
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    cacheDirReady = true;
  } catch (e) {
    console.warn("[Cache] Không thể tạo cache dir:", e);
  }
}

// ─── yt-dlp (chỉ dùng trên non-serverless) ──────────────────────────────────
function getYtDlpBin(): string {
  const localWin = path.join(process.cwd(), "api_dl", "bin", "yt-dlp.exe");
  const localLinux = path.join(process.cwd(), "api_dl", "bin", "yt-dlp");
  if (process.platform === "win32" && existsSync(localWin)) return localWin;
  if (process.platform !== "win32" && existsSync(localLinux)) return localLinux;
  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

// ─── youtubei.js (Vercel fallback) ───────────────────────────────────────────
let ytInstance: Innertube | null = null;
let ytInitPromise: Promise<Innertube> | null = null;

async function getYT(): Promise<Innertube> {
  if (ytInstance) return ytInstance;
  if (ytInitPromise) return ytInitPromise;
  ytInitPromise = Innertube.create({ location: "VN", retrieve_player: false })
    .then(yt => { ytInstance = yt; return yt; })
    .catch(err => { ytInitPromise = null; throw err; });
  return ytInitPromise;
}

// ─── Piped API fallback ───────────────────────────────────────────────────────
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://piped-api.garudalinux.org",
];

async function getPipedStreamUrl(videoId: string, wantVideo: boolean): Promise<string | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${instance}/streams/${videoId}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json() as any;
      if (wantVideo) {
        const s = (data.videoStreams || []).find((s: any) => !s.videoOnly && s.mimeType?.startsWith("video/mp4"))
          || (data.videoStreams || []).filter((s: any) => s.mimeType?.startsWith("video/mp4")).sort((a: any, b: any) => (b.quality || 0) - (a.quality || 0))[0];
        if (s?.url) return s.url;
      } else {
        const s = (data.audioStreams || []).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (s?.url) return s.url;
      }
    } catch {}
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const str = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
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

export function getBaseUrl(req: Request): string {
  const host = req.get("host") || "localhost:3002";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  return `${IS_VERCEL ? "https" : proto}://${host}`;
}

export function generateToken(id: string, expires: number): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(`${id}:${expires}`).digest("hex").slice(0, 16);
}

export function validateToken(id: string, req: Request, res: Response): boolean {
  const { expires, token } = req.query;
  if (expires || token) {
    const expNum = Number(expires);
    if (!expNum || isNaN(expNum) || Date.now() > expNum) {
      res.status(410).json({ status: false, message: "Link đã hết hạn. Vui lòng lấy link mới." });
      return false;
    }
    if (token !== generateToken(id, expNum)) {
      res.status(403).json({ status: false, message: "Token không hợp lệ." });
      return false;
    }
  }
  return true;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export interface YouTubeMetadata {
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

async function getMetaViaYtDlp(videoId: string): Promise<YouTubeMetadata | null> {
  return new Promise((resolve) => {
    let stdout = "";
    const proc = spawn(getYtDlpBin(), ["--dump-json", "--no-playlist", "--no-warnings", `https://www.youtube.com/watch?v=${videoId}`]);
    proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const info = JSON.parse(stdout.trim());
          const thumbs: any[] = info.thumbnails || [];
          resolve({
            title: info.title || "YouTube Media",
            author: info.uploader || info.channel || "YouTube Artist",
            duration: info.duration || 0,
            thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          });
          return;
        } catch {}
      }
      resolve(null);
    });
  });
}

async function getMetaViaInnertube(videoId: string): Promise<YouTubeMetadata | null> {
  try {
    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId);
    if (info?.basic_info?.title) {
      const thumbs = info.basic_info.thumbnail || [];
      return {
        title: info.basic_info.title,
        author: info.basic_info.author || "YouTube Artist",
        duration: info.basic_info.duration || 0,
        thumbnail: thumbs.length ? (thumbs as any)[thumbs.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  } catch {}
  return null;
}

async function getMetaViaOEmbed(videoId: string): Promise<YouTubeMetadata> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json() as any;
      return { title: data.title || "YouTube Media", author: data.author_name || "YouTube Artist", duration: 0, thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
    }
  } catch {}
  return { title: "YouTube Media", author: "YouTube Artist", duration: 0, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
}

export async function getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  if (!IS_SERVERLESS) {
    const meta = await getMetaViaYtDlp(videoId);
    if (meta) return meta;
  }
  const meta = await getMetaViaInnertube(videoId);
  if (meta) return meta;
  return getMetaViaOEmbed(videoId);
}

// ─── Cache Management (chỉ dùng local) ───────────────────────────────────────
interface CacheEntry { filePath: string; createdAt: number; sizeBytes: number; }
const cacheMap = new Map<string, CacheEntry>();
let cacheLoaded = false;

function loadCacheFromDisk() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  ensureCacheDir();
  try {
    for (const fname of readdirSync(CACHE_DIR)) {
      const m = fname.match(/^([a-zA-Z0-9_-]{11})\.(mp3|mp4)$/);
      if (!m) continue;
      const filePath = path.join(CACHE_DIR, fname);
      const stat = statSync(filePath);
      if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
        cacheMap.set(`${m[1]}_${m[2]}`, { filePath, createdAt: stat.mtimeMs, sizeBytes: stat.size });
      } else {
        try { unlinkSync(filePath); } catch {}
      }
    }
    console.log(`[Cache] Loaded ${cacheMap.size} valid entries.`);
  } catch {}
}

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of cacheMap.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      try { unlinkSync(entry.filePath); } catch {}
      cacheMap.delete(key);
    }
  }
}

// Lazy: chỉ schedule cleanup khi không phải serverless
let cleanupScheduled = false;
function ensureCleanupScheduled() {
  if (cleanupScheduled || IS_SERVERLESS) return;
  cleanupScheduled = true;
  setInterval(cleanCache, 10 * 60 * 1000);
  loadCacheFromDisk();
}

// ─── yt-dlp Download ──────────────────────────────────────────────────────────
async function downloadWithYtDlp(videoId: string, format: "mp3" | "mp4"): Promise<string> {
  ensureCacheDir();
  const outputPath = path.join(CACHE_DIR, `${videoId}.${format}`);
  const partialPath = outputPath + ".part";
  if (existsSync(partialPath)) try { unlinkSync(partialPath); } catch {}

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytDlpBin = getYtDlpBin();
  const args = format === "mp3"
    ? ["-x", "--audio-format", "mp3", "--audio-quality", "192K", "--no-playlist", "--no-warnings", "-o", outputPath, ytUrl]
    : ["-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", "--merge-output-format", "mp4", "--no-playlist", "--no-warnings", "-o", outputPath, ytUrl];

  return new Promise((resolve, reject) => {
    console.log(`[yt-dlp] Tải ${format.toUpperCase()} cho ${videoId}...`);
    const proc = spawn(ytDlpBin, args);
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => stderr += d.toString());
    proc.stdout.on("data", (d: Buffer) => { const l = d.toString().trim(); if (l) console.log(`[yt-dlp] ${l}`); });
    proc.on("error", (err) => reject(new Error(`yt-dlp không tìm thấy: ${err.message}`)));
    proc.on("close", (code) => {
      if (code === 0 && existsSync(outputPath)) {
        const stat = statSync(outputPath);
        cacheMap.set(`${videoId}_${format}`, { filePath: outputPath, createdAt: Date.now(), sizeBytes: stat.size });
        console.log(`[yt-dlp] ✅ Xong: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp thất bại (exit ${code}): ${stderr.slice(-300)}`));
      }
    });
  });
}

const downloadJobs = new Map<string, Promise<string>>();

async function getOrDownload(videoId: string, format: "mp3" | "mp4"): Promise<string> {
  const key = `${videoId}_${format}`;
  const cached = cacheMap.get(key);
  if (cached && existsSync(cached.filePath)) return cached.filePath;
  if (downloadJobs.has(key)) return downloadJobs.get(key)!;
  const job = downloadWithYtDlp(videoId, format)
    .finally(() => downloadJobs.delete(key));
  downloadJobs.set(key, job);
  return job;
}

// ─── Search ───────────────────────────────────────────────────────────────────
export interface MediaItem {
  id: string; title: string; artist: string; duration: string; thumbnail: string; url: string;
}

export interface SearchResult {
  status: boolean; type: string; query: string; total: number; data: MediaItem[]; message?: string;
}

async function searchViaYtDlp(query: string): Promise<MediaItem[]> {
  return new Promise((resolve) => {
    let stdout = "";
    const proc = spawn(getYtDlpBin(), ["--flat-playlist", "--dump-json", "--no-warnings", `ytsearch15:${query}`]);
    proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
    proc.on("error", () => resolve([]));
    proc.on("close", () => {
      const items: MediaItem[] = [];
      for (const line of stdout.trim().split("\n").filter(Boolean)) {
        try {
          const item = JSON.parse(line);
          items.push({
            id: item.id || "", title: item.title || "",
            artist: item.uploader || item.channel || "",
            duration: formatDuration(item.duration || 0),
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            url: `https://youtu.be/${item.id}`
          });
        } catch {}
      }
      resolve(items);
    });
  });
}

async function searchViaInnertube(query: string): Promise<MediaItem[]> {
  try {
    const yt = await getYT();
    const res = await yt.search(query, { type: "video" });
    return ((res.videos || []) as any[]).map((item: any) => {
      const sec = item.duration?.seconds || 0;
      const thumbs = item.thumbnails || [];
      return {
        id: item.id || "", title: item.title?.text || item.title || "",
        artist: item.author?.name || "",
        duration: item.duration?.text || formatDuration(sec),
        thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        url: `https://youtu.be/${item.id}`
      };
    });
  } catch { return []; }
}

export async function searchYouTube(query?: string): Promise<SearchResult> {
  const isHome = !query || query.trim() === "" || query.trim().toLowerCase() === "home";
  const searchTerm = isHome ? "Vpop nhạc trẻ thịnh hành 2026" : query!.trim();

  const videos = IS_SERVERLESS
    ? await searchViaInnertube(searchTerm)
    : await searchViaYtDlp(searchTerm).then(r => r.length > 0 ? r : searchViaInnertube(searchTerm));

  return {
    status: videos.length > 0,
    type: isHome ? "home" : "search",
    query: isHome ? "Bài hát đang thịnh hành (Home)" : searchTerm,
    total: videos.length,
    data: videos,
    message: videos.length === 0 ? "Không tìm thấy kết quả." : undefined
  };
}

// ─── Download Info ────────────────────────────────────────────────────────────
export interface DownloadInfoResult {
  status: boolean; id?: string; title?: string; author?: string; duration?: string;
  thumbnail?: string; type?: string; expires_in?: string; expires_at?: string;
  stream_url?: string; download_url?: string; cached?: boolean; message?: string;
}

export async function getYouTubeDownloadInfo(req: Request, input: string, formatType: string = "mp3"): Promise<DownloadInfoResult> {
  const videoId = extractVideoId(input);
  if (!videoId) return { status: false, message: "Không tìm thấy Video ID." };
  const format: "mp3" | "mp4" = formatType === "mp4" ? "mp4" : "mp3";

  try {
    const meta = await getYouTubeMetadata(videoId);
    const baseUrl = getBaseUrl(req);
    const expires = Date.now() + LINK_EXPIRES_MS;
    const token = generateToken(videoId, expires);

    return {
      status: true,
      id: videoId,
      title: meta.title,
      author: meta.author,
      duration: formatDuration(meta.duration),
      thumbnail: meta.thumbnail,
      type: format,
      expires_in: "15 phút",
      expires_at: new Date(expires).toISOString(),
      stream_url: `${baseUrl}/api/v1/youtube/file/${videoId}.${format}?expires=${expires}&token=${token}`,
      download_url: `${baseUrl}/api/v1/youtube/file/${videoId}.${format}?expires=${expires}&token=${token}&dl=1`,
      cached: !IS_SERVERLESS && cacheMap.has(`${videoId}_${format}`)
    };
  } catch (err: any) {
    return { status: false, message: "Lỗi lấy thông tin: " + err.message };
  }
}

// ─── Serve File (Local) / Redirect (Serverless) ────────────────────────────
export async function serveYouTubeFile(req: Request, res: Response, input: string, formatType: string = "mp3"): Promise<void> {
  const videoId = extractVideoId(input);
  if (!videoId) { res.status(400).json({ status: false, message: "Video ID không hợp lệ." }); return; }
  if (!validateToken(videoId, req, res)) return;

  const format: "mp3" | "mp4" = formatType === "mp4" ? "mp4" : "mp3";
  const isMp4 = format === "mp4";
  const isDownload = ["1", "2", "true", "attachment"].includes(String(req.query.dl || ""));

  // ── Serverless (Vercel): không thể chạy yt-dlp, dùng redirect fallback ──
  if (IS_SERVERLESS) {
    // Thử Piped API → redirect 302 (Vercel chỉ xử lý <1s)
    try {
      const pipedUrl = await getPipedStreamUrl(videoId, isMp4);
      if (pipedUrl) {
        console.log(`[Vercel] Redirect → Piped: ${pipedUrl.slice(0, 80)}...`);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.redirect(302, pipedUrl);
        return;
      }
    } catch {}

    // Thử youtubei.js stream trực tiếp
    try {
      const yt = await getYT();
      const clients = ["IOS", "ANDROID", "WEB"] as const;
      for (const client of clients) {
        try {
          const stream = await yt.download(videoId, { client, quality: "best", type: isMp4 ? "video+audio" : "audio" });
          const reader = (stream as any).getReader();
          const { done, value } = await reader.read();
          if (!done && value?.length > 0) {
            res.setHeader("Content-Type", isMp4 ? "video/mp4" : "audio/mpeg");
            res.setHeader("Transfer-Encoding", "chunked");
            res.write(value);
            const remaining = new Readable({ async read() {
              const { done, value } = await reader.read();
              this.push(done ? null : value);
            }});
            remaining.pipe(res);
            return;
          }
        } catch {}
      }
    } catch {}

    res.status(502).json({
      status: false,
      message: "Không thể stream trên Vercel serverless. Vui lòng dùng local server với yt-dlp."
    });
    return;
  }

  // ── Local Server: download → cache → serve file ──
  ensureCleanupScheduled();
  try {
    console.log(`[Serve] ${format.toUpperCase()} cho ${videoId}`);
    const filePath = await getOrDownload(videoId, format);
    if (!existsSync(filePath)) { res.status(500).json({ status: false, message: "File không tồn tại sau khi tải." }); return; }

    const stat = statSync(filePath);
    const fileSize = stat.size;
    const meta = await getYouTubeMetadata(videoId).catch(() => ({ title: videoId, author: "", duration: 0, thumbnail: "" }));
    const title = cleanName(meta.title || videoId);
    const disposition = isDownload ? "attachment" : "inline";

    res.setHeader("Content-Type", isMp4 ? "video/mp4" : "audio/mpeg");
    res.setHeader("Content-Disposition", `${disposition}; filename="${title.replace(/[^\x00-\x7F]/g, "_")}.${format}"; filename*=UTF-8''${encodeURIComponent(title)}.${format}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=900");

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", end - start + 1);
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.status(200);
      res.setHeader("Content-Length", fileSize);
      createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error("[Serve] Lỗi:", err.message);
    if (!res.headersSent) res.status(500).json({ status: false, message: "Không thể tải file: " + err.message });
  }
}

// ─── Legacy compat (server.ts import) ────────────────────────────────────────
export const streamYouTubeMedia = serveYouTubeFile;
