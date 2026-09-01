import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";
import { spawn } from "child_process";
import crypto from "crypto";
import { Request, Response } from "express";

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

export async function getYouTubeDownloadInfo(req: Request, input: string, formatType: string = "mp3"): Promise<DownloadInfoResult> {
  try {
    const videoId = extractVideoId(input);
    if (!videoId) {
      return { status: false, message: "Không tìm thấy Video ID từ link cung cấp." };
    }

    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId);
    const details = info.basic_info;

    const title = details.title || "YouTube Video";
    const author = details.author || "Không rõ";
    const duration = formatDuration(details.duration || 0);
    const thumbnails = details.thumbnail || [];
    const thumbnail = thumbnails.length ? thumbnails[thumbnails.length - 1].url : "";

    const type = (formatType && formatType.toLowerCase() === "mp4") ? "mp4" : "mp3";
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const expires = Date.now() + 15 * 60 * 1000;
    const token = generateToken(videoId, expires);
    const stream_url = `${baseUrl}/api/v1/youtube/stream/${videoId}.${type}?expires=${expires}&token=${token}`;
    const download_url = `${stream_url}&dl=3`;

    return {
      status: true,
      id: videoId,
      title: title,
      author: author,
      duration: duration,
      thumbnail: thumbnail,
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
    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId);
    const title = cleanName(info.basic_info.title || "youtube_media");
    const durationSec = info.basic_info.duration || 0;
    const isMp4 = (formatType && formatType.toLowerCase() === "mp4");
    const ext = isMp4 ? "mp4" : "mp3";

    const asciiTitle = title.replace(/[^\x00-\x7F]/g, "_");
    const encodedTitle = encodeURIComponent(title);

    const dlVal = String(req.query.dl || req.query.download || req.query.attachment || "").trim();
    const isDownload = Boolean(dlVal) && dlVal !== "0" && dlVal !== "false" && dlVal !== "inline";
    const dispositionMode = isDownload ? "attachment" : "inline";

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
    }

    const downloadStream = await yt.download(videoId, {
      client: "ANDROID",
      quality: "best"
    });

    const nodeStream = Readable.fromWeb(downloadStream as any);

    nodeStream.on("error", (err) => {
      console.error("Lỗi YouTube Stream:", err);
      if (!res.headersSent) res.status(500).json({ status: false, message: "Lỗi luồng tải YouTube." });
    });

    res.on("error", () => {
      try { nodeStream.destroy(); } catch {}
    });

    if (isMp4) {
      nodeStream.pipe(res);
      res.on("close", () => {
        try { nodeStream.destroy(); } catch {}
      });
      return;
    }

    // Với MP3: Chuyển đổi qua FFmpeg với tối ưu tua nhanh (fast seeking)
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

    ffmpegProc.on("error", (err) => {
      console.warn("FFmpeg không khả dụng, đang stream trực tiếp...");
      nodeStream.pipe(res);
    });

    nodeStream.pipe(ffmpegProc.stdin);
    ffmpegProc.stdout.pipe(res);

    res.on("close", () => {
      try { nodeStream.destroy(); } catch {}
      try { ffmpegProc.kill(); } catch {}
    });

  } catch (error: any) {
    console.error("Lỗi streamYouTubeMedia:", error);
    if (!res.headersSent) {
      res.status(500).json({ status: false, message: "Lỗi kết nối và xử lý YouTube: " + error.message });
    }
  }
}
