import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";
import { spawn } from "child_process";
import crypto from "crypto";
import { Request, Response } from "express";
import { searchSoundCloud, streamSoundCloudMedia } from "./soundcloud.js";

// Tắt các log cảnh báo Parser của Youtubei.js
Log.setLevel(Log.Level.NONE);

let ytInstance: Innertube | null = null;
let ytInitPromise: Promise<Innertube> | null = null;

export async function getYT(): Promise<Innertube> {
  if (ytInstance) return ytInstance;
  if (ytInitPromise) return ytInitPromise;

  ytInitPromise = (async () => {
    try {
      ytInstance = await Innertube.create({
        location: "VN",
        retrieve_player: true
      });
      return ytInstance;
    } catch (err) {
      ytInitPromise = null;
      throw err;
    }
  })();

  return ytInitPromise;
}

// Hàm tải stream với cơ chế fallback tự động chuyển đổi client YouTube (ưu tiên IOS -> ANDROID -> WEB ...)
export async function downloadYouTubeStream(yt: Innertube, videoId: string, type: "audio" | "video" | "video+audio" = "audio") {
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED", "YTMUSIC", "MWEB"] as const;
  let lastError: any = null;

  for (const client of clients) {
    try {
      const stream = await yt.download(videoId, {
        client: client,
        quality: "best",
        type: type
      });
      return stream;
    } catch (err: any) {
      lastError = err;
      console.warn(`[YouTube Stream] Client ${client} thất bại: ${err.message}, đang thử client tiếp theo...`);
    }
  }

  throw lastError || new Error("Không thể khởi tạo luồng tải YouTube với các client.");
}

// Kiểm tra FFmpeg có sẵn trên hệ thống hay không (tránh crash trên Vercel Serverless)
let ffmpegAvailable: boolean | null = null;
async function isFFmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  return new Promise((resolve) => {
    try {
      const proc = spawn("ffmpeg", ["-version"]);
      proc.on("error", () => {
        ffmpegAvailable = false;
        resolve(false);
      });
      proc.on("close", (code) => {
        ffmpegAvailable = code === 0;
        resolve(ffmpegAvailable);
      });
    } catch {
      ffmpegAvailable = false;
      resolve(false);
    }
  });
}

// Helper lấy base URL tương thích môi trường Vercel (HTTPS Reverse Proxy)
export function getBaseUrl(req: Request): string {
  const host = req.get("host") || "localhost:3000";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const isVercel = host.includes("vercel.app") || Boolean(process.env.VERCEL);
  const finalProto = isVercel ? "https" : proto;
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
      res.status(410).json({
        status: false,
        message: "Link download đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng gọi API lấy link mới."
      });
      return false;
    }
    const expectedToken = generateToken(id, expNum);
    if (token !== expectedToken) {
      res.status(403).json({
        status: false,
        message: "Token xác thực link download không hợp lệ."
      });
      return false;
    }
  }
  return true;
}

export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const str = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
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
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface MediaItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  duration_seconds?: number;
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

export async function searchYouTube(query?: string): Promise<SearchResult> {
  try {
    const yt = await getYT();
    const isHome = (!query || typeof query !== "string" || query.trim() === "" || query.trim().toLowerCase() === "home");
    const searchTerm = isHome ? "Vpop Music Video Official 2026 bài hát thịnh hành" : query.trim();

    const searchRes = await yt.search(searchTerm, { type: "video" });
    const rawVideos = (searchRes.videos || []) as any[];

    let videos: MediaItem[] = rawVideos.map((item: any) => {
      const sec = item.duration?.seconds || 0;
      const thumbnails = item.thumbnails || item.snippet?.thumbnails || [];
      const thumb = thumbnails.length ? thumbnails[thumbnails.length - 1].url : "";
      return {
        id: item.id || "",
        title: item.title?.text || item.title || "",
        artist: item.author?.name || item.author || "",
        duration: item.duration?.text || formatDuration(sec),
        duration_seconds: sec,
        thumbnail: thumb,
        url: `https://youtu.be/${item.id}`
      };
    });

    if (isHome) {
      const validDuration = videos.filter(v => (v.duration_seconds || 0) >= 120 && (v.duration_seconds || 0) <= 600);
      const otherDuration = videos.filter(v => (v.duration_seconds || 0) < 120 || (v.duration_seconds || 0) > 600);
      videos = [...validDuration, ...otherDuration];
    }

    const cleanData = videos.map(({ duration_seconds, ...rest }) => rest);

    return {
      status: true,
      type: isHome ? "home" : "search",
      query: isHome ? "Bài hát đang thịnh hành (Home)" : searchTerm,
      total: cleanData.length,
      data: cleanData
    };
  } catch (error: any) {
    console.error("Lỗi searchYouTube:", error);
    return {
      status: false,
      type: "error",
      query: query || "",
      total: 0,
      message: "Lỗi khi tìm kiếm YouTube: " + (error.message || "Unknown error"),
      data: []
    };
  }
}

export interface DownloadInfoResult {
  status: boolean;
  id?: string;
  title?: string;
  author?: string;
  duration?: string;
  thumbnail?: string;
  artwork?: string;
  type?: string;
  expires_in?: string;
  expires_at?: string;
  stream_url?: string;
  download_url?: string;
  message?: string;
}

export interface YouTubeMetadata {
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

export async function getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  try {
    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId);
    if (info?.basic_info?.title) {
      const thumbnails = info.basic_info.thumbnail || [];
      const thumb = thumbnails.length ? thumbnails[thumbnails.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      return {
        title: info.basic_info.title,
        author: info.basic_info.author || "YouTube Artist",
        duration: info.basic_info.duration || 0,
        thumbnail: thumb
      };
    }
  } catch (err: any) {
    console.warn(`[YouTube Metadata Warning] getBasicInfo failed (${err.message}). Using Google oEmbed Fallback...`);
  }

  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || "YouTube Media",
        author: data.author_name || "YouTube Artist",
        duration: 0,
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  } catch (e: any) {
    console.error("oEmbed fallback error:", e.message);
  }

  return {
    title: "YouTube Media",
    author: "YouTube Artist",
    duration: 0,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };
}

export async function getYouTubeDownloadInfo(req: Request, input: string, formatType: string = "mp3"): Promise<DownloadInfoResult> {
  try {
    const videoId = extractVideoId(input);
    if (!videoId) {
      return { status: false, message: "Không tìm thấy Video ID từ link cung cấp." };
    }

    const meta = await getYouTubeMetadata(videoId);
    const duration = formatDuration(meta.duration);

    const type = (formatType && formatType.toLowerCase() === "mp4") ? "mp4" : "mp3";
    const baseUrl = getBaseUrl(req);

    const expires = Date.now() + 15 * 60 * 1000;
    const token = generateToken(videoId, expires);
    const stream_url = `${baseUrl}/api/v1/youtube/stream/${videoId}.${type}?expires=${expires}&token=${token}&dl=1`;
    const download_url = `${baseUrl}/api/v1/youtube/stream/${videoId}.${type}?expires=${expires}&token=${token}&dl=2`;

    return {
      status: true,
      id: videoId,
      title: meta.title,
      author: meta.author,
      duration: duration,
      thumbnail: meta.thumbnail,
      type: type,
      expires_in: "15 phút",
      expires_at: new Date(expires).toISOString(),
      stream_url: stream_url,
      download_url: download_url
    };
  } catch (error: any) {
    console.error("Lỗi getYouTubeDownloadInfo:", error);
    return {
      status: false,
      message: "Không thể lấy thông tin video YouTube: " + (error.message || "Unknown error")
    };
  }
}

export async function streamYouTubeMedia(req: Request, res: Response, input: string, formatType: string = "mp3"): Promise<void> {
  const videoId = extractVideoId(input);
  if (!videoId) {
    res.status(400).json({ status: false, message: "Link hoặc Video ID không hợp lệ." });
    return;
  }

  if (!validateToken(videoId, req, res)) {
    return;
  }

  try {
    const meta = await getYouTubeMetadata(videoId);
    const title = cleanName(meta.title || "youtube_media");
    const durationSec = meta.duration || 0;
    const isMp4 = (formatType && formatType.toLowerCase() === "mp4");
    const ext = isMp4 ? "mp4" : "mp3";

    const asciiTitle = title.replace(/[^\x00-\x7F]/g, "_");
    const encodedTitle = encodeURIComponent(title);

    const dlVal = String(req.query.dl || "").trim();
    const isDownload = ["2", "3", "true", "attachment"].includes(dlVal) || req.query.download === "1" || req.query.attachment === "1";
    const dispositionMode = isDownload ? "attachment" : "inline";

    let downloadStream: any = null;
    let reader: any = null;
    let firstChunk: Uint8Array | null = null;

    try {
      const yt = await getYT();
      downloadStream = await downloadYouTubeStream(yt, videoId, isMp4 ? "video+audio" : "audio");
      reader = (downloadStream as any).getReader();
      const { done, value } = await reader.read();
      if (!done && value && value.length > 0) {
        firstChunk = value;
      }
    } catch (err: any) {
      console.warn(`[YouTube Stream] Thất bại khi giải mã luồng YouTube (${err.message}). Đang thử chuyển sang SoundCloud Fallback...`);
    }

    // Nếu YouTube bị chặn giải mã trên Vercel và đây là yêu cầu âm thanh (mp3)
    if (!firstChunk) {
      if (!isMp4) {
        try {
          const searchQuery = `${meta.title} ${meta.author}`.trim();
          console.log(`[YouTube Fallback] Tìm kiếm SoundCloud dự phòng cho: "${searchQuery}"...`);
          const scResult = await searchSoundCloud(searchQuery);
          if (scResult.status && scResult.data && scResult.data.length > 0) {
            const scTrackUrl = scResult.data[0].url;
            console.log(`[YouTube Fallback] Đã tìm thấy luồng SoundCloud dự phòng: ${scTrackUrl}`);
            return await streamSoundCloudMedia(req, res, scTrackUrl, true);
          }
        } catch (scErr: any) {
          console.error("Lỗi SoundCloud fallback:", scErr.message);
        }
      }

      if (!res.headersSent) {
        res.status(502).json({
          status: false,
          message: "Luồng YouTube không khả dụng. YouTube đã chặn giải mã chữ ký trên môi trường Serverless."
        });
      }
      return;
    }

    // Khi đã xác nhận có chunk dữ liệu hợp lệ (>0 bytes), tiến hành đặt Headers
    res.setHeader("Content-Type", isMp4 ? "video/mp4" : "audio/mpeg");
    res.setHeader("Content-Disposition", `${dispositionMode}; filename="${asciiTitle}.${ext}"; filename*=UTF-8''${encodedTitle}.${ext}`);
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    let totalSize = 0;
    let seekSeconds = 0;

    if (!isMp4 && durationSec > 0) {
      totalSize = Math.round(durationSec * 24000);
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      seekSeconds = Math.floor(start / 24000);

      if (totalSize > 0) {
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunksize = (end - start) + 1;
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
        res.setHeader("Content-Length", chunksize.toString());
      } else {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-/*`);
      }
    } else {
      res.status(200);
    }

    // Ghi chunk đầu tiên đã nhận được
    res.write(firstChunk);

    // Đóng gói các chunk còn lại từ Web Reader sang Node Stream
    const remainingStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(value);
          }
        } catch (err) {
          this.destroy(err as Error);
        }
      }
    });

    const hasFFmpeg = await isFFmpegAvailable();

    if (isMp4 || !hasFFmpeg) {
      // Stream các chunk còn lại trực tiếp tới client
      remainingStream.pipe(res);
      res.on("close", () => {
        try { remainingStream.destroy(); } catch {}
      });
      return;
    }

    // Với MP3 trên môi trường có FFmpeg (Local Server): Chuyển đổi qua FFmpeg với fast seeking
    const ffmpegArgs: string[] = ["-fflags", "+genpts+discardcorrupt"];
    if (seekSeconds > 0) {
      ffmpegArgs.push("-ss", seekSeconds.toString());
    }
    ffmpegArgs.push(
      "-i", "pipe:0",
      "-vn",
      "-acodec", "libmp3lame",
      "-ab", "192k",
      "-ar", "44100",
      "-f", "mp3",
      "pipe:1"
    );

    const ffmpegProc = spawn("ffmpeg", ffmpegArgs);

    ffmpegProc.stdin.on("error", () => {});
    ffmpegProc.stdout.on("error", () => {});

    ffmpegProc.on("error", () => {
      try { remainingStream.pipe(res); } catch {}
    });

    remainingStream.pipe(ffmpegProc.stdin);
    ffmpegProc.stdout.pipe(res);

    res.on("close", () => {
      try { remainingStream.destroy(); } catch {}
      try { ffmpegProc.kill(); } catch {}
    });

  } catch (error: any) {
    console.error("Lỗi streamYouTubeMedia:", error);
    if (!res.headersSent) {
      res.status(500).json({ status: false, message: "Lỗi kết nối và xử lý YouTube: " + error.message });
    }
  }
}

