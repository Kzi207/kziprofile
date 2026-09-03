import { Readable } from "stream";
import crypto from "crypto";
import { Request, Response } from "express";
import { DownloadInfoResult, MediaItem, SearchResult, getBaseUrl } from "./youtube.js";
import { withTimeout } from "./utils/withTimeout.js";

const SECRET_KEY = process.env.DOWNLOAD_SECRET_KEY || "media_dl_secret_15m";

// ─── btch-downloader (dynamic import vì CJS module) ───────────────────────────
let _btch: any = null;
async function getBtch(): Promise<any> {
  if (_btch) return _btch;
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  _btch = require("btch-downloader");
  return _btch;
}

// ─── SoundCloud Client IDs ────────────────────────────────────────────────────

const CLIENT_IDS = [
  process.env.SC_CLIENT_ID,
  "Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo",
  "iZ86MuBD7F8mqslBxkAovqEae68DHvZ1",
  "J47n2y66g1R4h6j7R3289i1y",
  "a3e059563d7fd3372b49b37f00a00bcf"
].filter(Boolean) as string[];

async function fetchWithClientId<T>(urlBuilder: (clientId: string) => string): Promise<T> {
  let lastErr: any;
  for (const clientId of CLIENT_IDS) {
    try {
      const url = urlBuilder(clientId);
      const res = await fetch(url);
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`SoundCloud HTTP ${res.status}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Không thể kết nối tới SoundCloud API.");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateToken(id: string | number, expires: number): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(`${id}:${expires}`).digest("hex").slice(0, 16);
}

export function validateToken(id: string | number, req: Request, res: Response): boolean {
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
      res.status(403).json({ status: false, message: "Token xác thực link download không hợp lệ." });
      return false;
    }
  }
  return true;
}

export function cleanName(name: string): string {
  return (name || "").replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
}

export function formatDuration(ms: number): string {
  if (!ms || isNaN(ms)) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── SoundCloud Search ────────────────────────────────────────────────────────

export async function searchSoundCloud(query?: string): Promise<SearchResult> {
  try {
    const isHome = (!query || typeof query !== "string" || query.trim() === "" || query.trim().toLowerCase() === "home");
    const searchTerm = isHome ? "nhạc trẻ thịnh hành" : query.trim();

    const data = await fetchWithClientId<any>(clientId =>
      `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(searchTerm)}&client_id=${clientId}&limit=20`
    );

    let rawTracks = data.collection || [];
    let tracks: MediaItem[] = rawTracks.map((track: any) => {
      const ms = track.duration || 0;
      const sec = Math.floor(ms / 1000);
      return {
        id: String(track.id),
        urn: track.urn,
        title: track.title || "",
        artist: track.user?.username || "",
        duration: formatDuration(ms),
        duration_seconds: sec,
        thumbnail: track.artwork_url || track.user?.avatar_url || "",
        url: track.permalink_url || ""
      };
    });

    if (isHome) {
      const valid = tracks.filter(t => (t.duration_seconds || 0) >= 120 && (t.duration_seconds || 0) <= 600);
      const other = tracks.filter(t => (t.duration_seconds || 0) < 120 || (t.duration_seconds || 0) > 600);
      tracks = [...valid, ...other];
    }

    const cleanData = tracks.map(({ duration_seconds, ...rest }) => rest);
    return {
      status: true,
      type: isHome ? "home" : "search",
      query: isHome ? "Bài hát đang thịnh hành (Home)" : searchTerm,
      total: cleanData.length,
      data: cleanData
    };
  } catch (error: any) {
    console.error("Lỗi searchSoundCloud:", error);
    return {
      status: false,
      type: "error",
      query: query || "",
      total: 0,
      message: "Lỗi khi tìm kiếm SoundCloud: " + (error.message || "Unknown error"),
      data: []
    };
  }
}

// ─── Resolve SoundCloud track info ───────────────────────────────────────────

async function resolveTrackInfo(input: string): Promise<any> {
  const cleanInput = String(input).trim();
  if (/^\d+$/.test(cleanInput)) {
    return await fetchWithClientId<any>(clientId => `https://api-v2.soundcloud.com/tracks/${cleanInput}?client_id=${clientId}`);
  }
  return await fetchWithClientId<any>(clientId => `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(cleanInput)}&client_id=${clientId}`);
}

// ─── btch SoundCloud download URL ────────────────────────────────────────────

async function getBtchSoundCloudUrl(trackUrl: string): Promise<string | null> {
  try {
    const btch = await getBtch();
    if (typeof btch.soundcloud !== "function") return null;

    const result: any = await withTimeout(
      btch.soundcloud(trackUrl),
      15_000,
      "btch soundcloud timed out"
    );

    if (!result || result.error || result.status === false) return null;

    const url = result.url || result.mp3 || result.audio || result.download;
    if (url && typeof url === "string") return url;

    if (Array.isArray(result.medias) && result.medias.length > 0) {
      return result.medias[0]?.url || null;
    }
  } catch (err: any) {
    console.warn(`[btch SoundCloud] Thất bại: ${err.message}`);
  }
  return null;
}

// ─── SoundCloud Download Info ─────────────────────────────────────────────────

export async function getSoundCloudDownloadInfo(req: Request, input: string, formatType: string = "mp3"): Promise<DownloadInfoResult> {
  try {
    if (!input) return { status: false, message: "Thiếu link hoặc Track ID SoundCloud." };

    const track = await resolveTrackInfo(input);
    if (!track) return { status: false, message: "Không tìm thấy bài hát trên SoundCloud." };

    const title = track.title || "SoundCloud Track";
    const author = track.user?.username || "Không rõ";
    const duration = formatDuration(track.duration);
    const artwork = track.artwork_url || track.user?.avatar_url || "";

    const baseUrl = getBaseUrl(req);
    const expires = Date.now() + 15 * 60 * 1000;
    const token = generateToken(track.id, expires);
    const stream_url = `${baseUrl}/api/v1/soundcloud/stream/${track.id}.mp3?expires=${expires}&token=${token}&dl=1`;
    const download_url = `${baseUrl}/api/v1/soundcloud/stream/${track.id}.mp3?expires=${expires}&token=${token}&dl=2`;

    return {
      status: true,
      id: String(track.id),
      title,
      author,
      duration,
      thumbnail: artwork,
      artwork,
      type: "mp3",
      expires_in: "15 phút",
      expires_at: new Date(expires).toISOString(),
      stream_url,
      download_url
    };
  } catch (error: any) {
    console.error("Lỗi getSoundCloudDownloadInfo:", error);
    return { status: false, message: "Không thể lấy thông tin download SoundCloud: " + (error.message || "Unknown error") };
  }
}

// ─── Stream SoundCloud Media ──────────────────────────────────────────────────

export async function streamSoundCloudMedia(req: Request, res: Response, input: string, skipTokenCheck = false): Promise<void> {
  if (!input) {
    res.status(400).json({ status: false, message: "Thiếu link hoặc Track ID SoundCloud." });
    return;
  }

  try {
    const track = await resolveTrackInfo(input);
    if (!track) {
      res.status(404).json({ status: false, message: "Không tìm thấy bài hát SoundCloud." });
      return;
    }

    if (!skipTokenCheck && !validateToken(track.id, req, res)) return;

    const title = cleanName(track.title || "soundcloud_track");
    const asciiTitle = title.replace(/[^\x00-\x7F]/g, "_");
    const encodedTitle = encodeURIComponent(title);

    const dlVal = String(req.query.dl || "").trim();
    const isDownload = ["2", "3", "true", "attachment"].includes(dlVal) || req.query.download === "1" || req.query.attachment === "1";
    const dispositionMode = isDownload ? "attachment" : "inline";

    // ─── Phương thức 1: btch-downloader (ưu tiên) ─────────────────────────
    const permalinkUrl = track.permalink_url || input;
    if (permalinkUrl && permalinkUrl.startsWith("http")) {
      console.log(`[SoundCloud] 🚀 Thử btch-downloader cho: ${permalinkUrl}...`);
      const btchUrl = await getBtchSoundCloudUrl(permalinkUrl);
      if (btchUrl) {
        console.log(`[SoundCloud] ✅ btch-downloader redirect 302...`);
        if (!res.headersSent) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Content-Disposition", `${dispositionMode}; filename="${asciiTitle}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`);
          res.redirect(302, btchUrl);
        }
        return;
      }
      console.warn(`[SoundCloud] ⚠️ btch-downloader thất bại. Dùng SoundCloud API trực tiếp...`);
    }

    // ─── Phương thức 2: SoundCloud API trực tiếp ──────────────────────────
    const transcodings = track.media?.transcodings || [];
    if (!transcodings.length) {
      res.status(400).json({ status: false, message: "Không tìm thấy media stream cho bài hát này." });
      return;
    }

    const prog = transcodings.find((t: any) => t.format?.protocol === "progressive") || transcodings[0];
    const streamData = await fetchWithClientId<any>(clientId => `${prog.url}?client_id=${clientId}`);
    const directUrl = streamData.url;

    if (!directUrl) {
      res.status(500).json({ status: false, message: "Không thể lấy direct URL để tải." });
      return;
    }

    const mediaRes = await fetch(directUrl);
    if (!mediaRes.ok || !mediaRes.body) {
      res.status(500).json({ status: false, message: "Lỗi khi tải stream dữ liệu âm thanh." });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `${dispositionMode}; filename="${asciiTitle}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`);
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    const contentLength = mediaRes.headers.get("content-length");
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

    if (range && totalSize > 0) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = (end - start) + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      res.setHeader("Content-Length", chunksize.toString());
    } else if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-/*`);
    } else if (totalSize > 0) {
      res.setHeader("Content-Length", totalSize.toString());
    }

    const nodeStream = Readable.fromWeb(mediaRes.body as any);
    res.on("error", () => { try { nodeStream.destroy(); } catch {} });
    nodeStream.pipe(res);
    res.on("close", () => { try { nodeStream.destroy(); } catch {} });

  } catch (error: any) {
    console.error("Lỗi streamSoundCloudMedia:", error);
    if (!res.headersSent) {
      res.status(500).json({ status: false, message: "Lỗi stream SoundCloud media: " + error.message });
    }
  }
}
