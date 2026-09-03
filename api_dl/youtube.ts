import { spawn } from "child_process";
import { existsSync, mkdirSync, statSync, readdirSync, unlinkSync, createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import { Request, Response } from "express";

// ─── Config ────────────────────────────────────────────────────────────────────
const CACHE_DIR = path.join(process.cwd(), "cache");
const CACHE_TTL_MS = 60 * 60 * 1000;        // File cache tồn tại 1 tiếng
const MAX_CACHE_MB = 2048;                    // Tối đa 2GB cache
const LINK_EXPIRES_MS = 15 * 60 * 1000;      // Link public hết hạn 15 phút
const SECRET_KEY = process.env.DOWNLOAD_SECRET_KEY || "media_dl_secret_15m";

// Đảm bảo thư mục cache tồn tại
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// ─── yt-dlp Binary ──────────────────────────────────────────────────────────
function getYtDlpBin(): string {
  // Ưu tiên binary cạnh project, fallback sang PATH
  const localWin = path.join(process.cwd(), "bin", "yt-dlp.exe");
  const localLinux = path.join(process.cwd(), "bin", "yt-dlp");
  if (process.platform === "win32" && existsSync(localWin)) return localWin;
  if (process.platform !== "win32" && existsSync(localLinux)) return localLinux;
  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const str = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function cleanName(name: string): string {
  return (name || "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
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
  const isVercel = host.includes("vercel.app") || Boolean(process.env.VERCEL);
  return `${isVercel ? "https" : proto}://${host}`;
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

// ─── Cache Management ────────────────────────────────────────────────────────

interface CacheEntry {
  filePath: string;
  createdAt: number;
  sizeBytes: number;
}

const cacheMap = new Map<string, CacheEntry>();

function getCacheKey(videoId: string, format: "mp3" | "mp4"): string {
  return `${videoId}_${format}`;
}

function getCacheFilePath(videoId: string, format: "mp3" | "mp4"): string {
  return path.join(CACHE_DIR, `${videoId}.${format}`);
}

/** Xóa file cache quá hạn hoặc khi vượt giới hạn dung lượng */
function cleanCache() {
  const now = Date.now();
  // Xóa file hết hạn
  for (const [key, entry] of cacheMap.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      try { unlinkSync(entry.filePath); } catch {}
      cacheMap.delete(key);
      console.log(`[Cache] Đã xóa hết hạn: ${path.basename(entry.filePath)}`);
    }
  }

  // Kiểm tra tổng dung lượng
  let totalBytes = 0;
  for (const entry of cacheMap.values()) totalBytes += entry.sizeBytes;
  const maxBytes = MAX_CACHE_MB * 1024 * 1024;

  if (totalBytes > maxBytes) {
    // Xóa file cũ nhất trước
    const sorted = [...cacheMap.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (const [key, entry] of sorted) {
      try { unlinkSync(entry.filePath); } catch {}
      cacheMap.delete(key);
      totalBytes -= entry.sizeBytes;
      console.log(`[Cache] Đã xóa (vượt giới hạn): ${path.basename(entry.filePath)}`);
      if (totalBytes <= maxBytes * 0.8) break;
    }
  }
}

// Dọn dẹp cache mỗi 10 phút
setInterval(cleanCache, 10 * 60 * 1000);

// Load cache từ disk khi khởi động (các file còn trong CACHE_DIR)
try {
  for (const fname of readdirSync(CACHE_DIR)) {
    const m = fname.match(/^([a-zA-Z0-9_-]{11})\.(mp3|mp4)$/);
    if (!m) continue;
    const [, videoId, fmt] = m;
    const filePath = path.join(CACHE_DIR, fname);
    const stat = statSync(filePath);
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL_MS) {
      const key = getCacheKey(videoId, fmt as "mp3" | "mp4");
      cacheMap.set(key, { filePath, createdAt: stat.mtimeMs, sizeBytes: stat.size });
    } else {
      try { unlinkSync(filePath); } catch {}
    }
  }
  console.log(`[Cache] Khởi động với ${cacheMap.size} file cache hợp lệ.`);
} catch {}

// ─── yt-dlp Download ─────────────────────────────────────────────────────────

/** Download video/audio về server dùng yt-dlp, trả về đường dẫn file */
async function downloadWithYtDlp(videoId: string, format: "mp3" | "mp4"): Promise<string> {
  const outputPath = getCacheFilePath(videoId, format);

  // Nếu đang có file đang tải (partial), xóa đi tải lại
  const partialPath = outputPath + ".part";
  if (existsSync(partialPath)) {
    try { unlinkSync(partialPath); } catch {}
  }

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytDlpBin = getYtDlpBin();

  const args: string[] = [];

  if (format === "mp3") {
    args.push(
      "-x",                        // Extract audio
      "--audio-format", "mp3",
      "--audio-quality", "192K",
      "--no-playlist",
      "--no-warnings",
      "-o", outputPath,
      ytUrl
    );
  } else {
    // mp4: video + audio, merge thành mp4
    args.push(
      "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-warnings",
      "-o", outputPath,
      ytUrl
    );
  }

  return new Promise((resolve, reject) => {
    console.log(`[yt-dlp] Bắt đầu tải ${format.toUpperCase()} cho ${videoId}...`);
    const proc = spawn(ytDlpBin, args);

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.stdout.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) console.log(`[yt-dlp] ${line}`);
    });

    proc.on("error", (err) => {
      reject(new Error(`yt-dlp không tìm thấy hoặc lỗi khởi động: ${err.message}. Hãy cài yt-dlp vào PATH hoặc thư mục bin/`));
    });

    proc.on("close", (code) => {
      if (code === 0 && existsSync(outputPath)) {
        const stat = statSync(outputPath);
        console.log(`[yt-dlp] ✅ Tải xong: ${path.basename(outputPath)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
        resolve(outputPath);
      } else {
        // yt-dlp đôi khi thêm .mp3 vào tên file (khi dùng -x)
        const altPath = outputPath.replace(/\.mp3$/, "") + ".mp3";
        if (format === "mp3" && existsSync(altPath) && altPath !== outputPath) {
          const stat = statSync(altPath);
          console.log(`[yt-dlp] ✅ Tải xong (alt path): ${path.basename(altPath)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
          resolve(altPath);
          return;
        }
        console.error(`[yt-dlp] ❌ Thất bại (exit ${code}):\n${stderr.slice(-500)}`);
        reject(new Error(`yt-dlp thất bại (exit ${code}). ${stderr.slice(-200)}`));
      }
    });
  });
}

// ─── yt-dlp Metadata ──────────────────────────────────────────────────────────

export interface YouTubeMetadata {
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

/** Lấy metadata từ yt-dlp --dump-json (nhanh, không cần tải file) */
export async function getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytDlpBin = getYtDlpBin();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(ytDlpBin, [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      ytUrl
    ]);

    proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
    proc.stderr.on("data", (d: Buffer) => stderr += d.toString());

    proc.on("error", () => {
      // Fallback nếu không có yt-dlp
      resolve(fallbackOEmbed(videoId));
    });

    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const info = JSON.parse(stdout.trim());
          const thumbnails: any[] = info.thumbnails || [];
          const bestThumb = thumbnails.length
            ? thumbnails[thumbnails.length - 1].url
            : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

          resolve({
            title: info.title || "YouTube Media",
            author: info.uploader || info.channel || "YouTube Artist",
            duration: info.duration || 0,
            thumbnail: bestThumb
          });
          return;
        } catch {}
      }
      resolve(fallbackOEmbed(videoId));
    });
  });
}

async function fallbackOEmbed(videoId: string): Promise<YouTubeMetadata> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json() as any;
      return {
        title: data.title || "YouTube Media",
        author: data.author_name || "YouTube Artist",
        duration: 0,
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  } catch {}
  return {
    title: "YouTube Media",
    author: "YouTube Artist",
    duration: 0,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };
}

// ─── Download Job Queue ───────────────────────────────────────────────────────
// Tránh tải trùng khi nhiều request cùng lúc cho cùng 1 video

const downloadJobs = new Map<string, Promise<string>>();

async function getOrDownload(videoId: string, format: "mp3" | "mp4"): Promise<string> {
  const key = getCacheKey(videoId, format);

  // Đã có trong cache và file vẫn còn tồn tại
  const cached = cacheMap.get(key);
  if (cached && existsSync(cached.filePath)) {
    console.log(`[Cache] ✅ Cache hit: ${videoId}.${format}`);
    return cached.filePath;
  }

  // Đang có job tải → chờ chung
  if (downloadJobs.has(key)) {
    console.log(`[Download] ⏳ Đang chờ job đang tải: ${videoId}.${format}`);
    return downloadJobs.get(key)!;
  }

  // Tạo job mới
  const job = downloadWithYtDlp(videoId, format)
    .then((filePath) => {
      const stat = statSync(filePath);
      cacheMap.set(key, { filePath, createdAt: Date.now(), sizeBytes: stat.size });
      downloadJobs.delete(key);
      return filePath;
    })
    .catch((err) => {
      downloadJobs.delete(key);
      throw err;
    });

  downloadJobs.set(key, job);
  return job;
}

// ─── Public API Functions ─────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  url: string;
}

export interface SearchResult {
  status: boolean;
  type: string;
  query: string;
  total: number;
  data: MediaItem[];
  message?: string;
}

/** Tìm kiếm YouTube bằng yt-dlp (flat-playlist) */
export async function searchYouTube(query?: string): Promise<SearchResult> {
  const isHome = !query || query.trim() === "" || query.trim().toLowerCase() === "home";
  const searchTerm = isHome ? "ytsearch15:Vpop nhạc trẻ thịnh hành 2026" : `ytsearch15:${query!.trim()}`;

  return new Promise((resolve) => {
    const ytDlpBin = getYtDlpBin();
    let stdout = "";
    let stderr = "";

    const proc = spawn(ytDlpBin, [
      "--flat-playlist",
      "--dump-json",
      "--no-warnings",
      searchTerm
    ]);

    proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
    proc.stderr.on("data", (d: Buffer) => stderr += d.toString());

    proc.on("error", () => {
      resolve({ status: false, type: "error", query: query || "", total: 0, data: [], message: "yt-dlp không khả dụng." });
    });

    proc.on("close", (code) => {
      const lines = stdout.trim().split("\n").filter(Boolean);
      const videos: MediaItem[] = [];

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          const sec = item.duration || 0;
          videos.push({
            id: item.id || "",
            title: item.title || "",
            artist: item.uploader || item.channel || "",
            duration: formatDuration(sec),
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            url: `https://youtu.be/${item.id}`
          });
        } catch {}
      }

      resolve({
        status: videos.length > 0,
        type: isHome ? "home" : "search",
        query: isHome ? "Bài hát đang thịnh hành (Home)" : (query || ""),
        total: videos.length,
        data: videos,
        message: videos.length === 0 ? "Không tìm thấy kết quả." : undefined
      });
    });
  });
}

export interface DownloadInfoResult {
  status: boolean;
  id?: string;
  title?: string;
  author?: string;
  duration?: string;
  thumbnail?: string;
  type?: string;
  expires_in?: string;
  expires_at?: string;
  stream_url?: string;
  download_url?: string;
  cached?: boolean;
  message?: string;
}

/** Lấy info + trigger download ngầm, trả về link serve */
export async function getYouTubeDownloadInfo(req: Request, input: string, formatType: string = "mp3"): Promise<DownloadInfoResult> {
  const videoId = extractVideoId(input);
  if (!videoId) return { status: false, message: "Không tìm thấy Video ID." };

  const format: "mp3" | "mp4" = formatType === "mp4" ? "mp4" : "mp3";

  try {
    // Lấy metadata và bắt đầu tải song song
    const [meta] = await Promise.all([
      getYouTubeMetadata(videoId)
    ]);

    const baseUrl = getBaseUrl(req);
    const expires = Date.now() + LINK_EXPIRES_MS;
    const token = generateToken(videoId, expires);

    const stream_url = `${baseUrl}/api/v1/youtube/file/${videoId}.${format}?expires=${expires}&token=${token}`;
    const download_url = `${baseUrl}/api/v1/youtube/file/${videoId}.${format}?expires=${expires}&token=${token}&dl=1`;

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
      stream_url,
      download_url,
      cached: cacheMap.has(getCacheKey(videoId, format))
    };
  } catch (err: any) {
    return { status: false, message: "Lỗi lấy thông tin: " + err.message };
  }
}

/** Serve file đã tải (download vào server trước nếu chưa có trong cache) */
export async function serveYouTubeFile(req: Request, res: Response, input: string, formatType: string = "mp3"): Promise<void> {
  const videoId = extractVideoId(input);
  if (!videoId) {
    res.status(400).json({ status: false, message: "Video ID không hợp lệ." });
    return;
  }

  if (!validateToken(videoId, req, res)) return;

  const format: "mp3" | "mp4" = formatType === "mp4" ? "mp4" : "mp3";
  const isDownload = ["1", "2", "true", "attachment"].includes(String(req.query.dl || ""));

  try {
    // Download về server nếu chưa có (blocking – client chờ)
    console.log(`[Serve] Yêu cầu ${format.toUpperCase()} cho ${videoId} (cached=${cacheMap.has(getCacheKey(videoId, format))})`);
    const filePath = await getOrDownload(videoId, format);

    if (!existsSync(filePath)) {
      res.status(500).json({ status: false, message: "File không tồn tại sau khi tải." });
      return;
    }

    const stat = statSync(filePath);
    const fileSize = stat.size;

    // Lấy title để đặt tên file download
    const meta = await getYouTubeMetadata(videoId).catch(() => ({ title: videoId, author: "", duration: 0, thumbnail: "" }));
    const title = cleanName(meta.title || videoId);
    const asciiTitle = title.replace(/[^\x00-\x7F]/g, "_");
    const encodedTitle = encodeURIComponent(title);

    const contentType = format === "mp4" ? "video/mp4" : "audio/mpeg";
    const disposition = isDownload ? "attachment" : "inline";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `${disposition}; filename="${asciiTitle}.${format}"; filename*=UTF-8''${encodedTitle}.${format}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=900"); // cache 15 phút ở client

    // Hỗ trợ HTTP Range (tua bài)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", chunkSize);

      const stream = createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader("Content-Length", fileSize);
      createReadStream(filePath).pipe(res);
    }

    console.log(`[Serve] ✅ Đang gửi ${(fileSize / 1024 / 1024).toFixed(1)} MB → client`);
  } catch (err: any) {
    console.error(`[Serve] ❌ Lỗi:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ status: false, message: "Không thể tải file: " + err.message });
    }
  }
}
