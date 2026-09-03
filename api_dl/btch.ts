import { Request, Response } from "express";
import { Readable } from "stream";
import * as btchModule from "btch-downloader";

const btch: any = (btchModule as any).default || btchModule;

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
    note: "Tự động nhận diện nền tảng từ URL và lấy link tải.",
  },
  tiktok: { fn: "ttdl", queryType: "url", example: "https://www.tiktok.com/@user/video/1234567890" },
  instagram: { fn: "igdl", queryType: "url", example: "https://www.instagram.com/reel/xxxxxxxxxxx/" },
  facebook: { fn: "fbdown", queryType: "url", example: "https://www.facebook.com/watch/?v=1234567890" },
  twitter: { fn: "twitter", queryType: "url", example: "https://twitter.com/user/status/1234567890" },
  youtube: { fn: "youtube", queryType: "url", example: "https://youtu.be/xxxxxxxxxxx" },
  "youtube-search": { fn: "yts", queryType: "query", example: "Somewhere Only We Know" },
  spotify: { fn: "spotify", queryType: "url", example: "https://open.spotify.com/track/xxxxxxxxxxxxxxxxxxxxxx" },
  soundcloud: { fn: "soundcloud", queryType: "url", example: "https://soundcloud.com/artist/track-name" },
  pinterest: { fn: "pinterest", queryType: "url_or_query", example: "https://pin.it/xxxxxxx (hoặc từ khóa)" },
  mediafire: { fn: "mediafire", queryType: "url", example: "https://www.mediafire.com/file/xxxxxxxxxxx/name/file" },
  gdrive: { fn: "gdrive", queryType: "url", example: "https://drive.google.com/file/d/xxxxxxxxxxx/view" },
  capcut: { fn: "capcut", queryType: "url", example: "https://www.capcut.com/template-detail/xxxxxxxxxxx" },
  douyin: { fn: "douyin", queryType: "url", example: "https://v.douyin.com/xxxxxxx/" },
  xiaohongshu: { fn: "xiaohongshu", queryType: "url", example: "https://xhslink.com/o/xxxxxxxxxxx" },
  snackvideo: { fn: "snackvideo", queryType: "url", example: "https://s.snackvideo.com/p/xxxxxxxx" },
  cocofun: { fn: "cocofun", queryType: "url", example: "https://www.icocofun.com/share/post/xxxxxxxxxxx" },
};

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

const MAX_INPUT_LENGTH = 2000;
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

export function requireNonEmptyString(value: any, paramName: string, { maxLength = MAX_INPUT_LENGTH } = {}): string {
  if (typeof value !== "string") {
    throw new ApiError(400, `"${paramName}" phải là một chuỗi.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `"${paramName}" là bắt buộc và không thể để trống.`);
  }
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `"${paramName}" quá dài (tối đa ${maxLength} ký tự).`);
  }
  if (CONTROL_CHAR_PATTERN.test(trimmed)) {
    throw new ApiError(400, `"${paramName}" chứa ký tự điều khiển không hợp lệ.`);
  }
  return trimmed;
}

export function requireHttpUrl(value: any, paramName: string): string {
  const trimmed = requireNonEmptyString(value, paramName);
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError(400, `"${paramName}" phải là URL tuyệt đối hợp lệ.`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new ApiError(400, `"${paramName}" phải sử dụng giao thức http hoặc https.`);
  }
  return trimmed;
}

export function requireInputForQueryType(value: any, queryType: string, paramName: string): string {
  const trimmed = requireNonEmptyString(value, paramName);
  if (queryType === "url") {
    try {
      return requireHttpUrl(trimmed, paramName);
    } catch (err) {
      if (/^https?:\/\//i.test(trimmed) || (trimmed.includes(".") && !trimmed.includes(" "))) {
        throw err;
      }
      return trimmed;
    }
  }
  return trimmed;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message = "Thao tác quá thời gian chờ"): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function normalizeInputForDownloader(input: string): string {
  let v = String(input || "").trim();
  if (!v) return v;
  v = v.replace(/^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&/]+).*$/i, "https://www.youtube.com/watch?v=$1");
  v = v.replace(/^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?&/]+).*$/i, "https://www.youtube.com/watch?v=$1");
  return v;
}

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function looksLikeFailurePayload(contentType: string): boolean {
  return /^(text\/html|application\/json|text\/plain)\b/i.test(contentType || "");
}

export function listPlatforms(req: Request, res: Response) {
  const availablePlatforms = Object.entries(PLATFORMS)
    .filter(([_, cfg]) => typeof btch[cfg.fn] === "function")
    .map(([key, value]) => ({
      key,
      queryType: value.queryType,
      example: value.example,
      ...(value.note ? { note: value.note } : {}),
    }));
  return res.json({ success: true, count: availablePlatforms.length, platforms: availablePlatforms });
}

export async function downloadPlatformMedia(req: Request, res: Response) {
  const { platform } = req.params;
  const input = req.query.url || req.query.search || req.query.query;

  const config = PLATFORMS[platform];
  if (!config) {
    throw new ApiError(404, `Nền tảng "${platform}" không được hỗ trợ. Gọi /api/v1/platforms để xem danh sách.`);
  }

  const paramName = req.query.url ? "url" : req.query.search ? "search" : config.queryType === "query" ? "query" : "url";
  if (input === undefined) {
    throw new ApiError(400, `Thiếu tham số bắt buộc "url" hoặc "search". Ví dụ: /api/v1/${platform}?url=${encodeURIComponent(config.example)}`);
  }
  const rawQuery = requireInputForQueryType(input, config.queryType, paramName);

  const fn = btch[config.fn];
  if (typeof fn !== "function") {
    const available = Object.keys(btch).filter((k) => typeof btch[k] === "function");
    throw new ApiError(404, `Hàm downloader "${config.fn}" không có sẵn. Các hàm khả dụng: ${available.join(", ")}`);
  }

  let normalizedQuery = rawQuery;
  if (/(youtube|aio)/i.test(platform)) {
    normalizedQuery = normalizeInputForDownloader(rawQuery);
  }

  const timeoutMs = Number(process.env.DOWNLOAD_TIMEOUT_MS) || 25_000;
  const data: any = await withTimeout(
    fn(normalizedQuery),
    timeoutMs,
    `Hệ thống tải về cho ${platform} phản hồi quá lâu.`
  ).catch((err) => {
    if (err.message.includes("phản hồi quá lâu") || err.message.includes("timed out")) {
      throw new ApiError(504, err.message);
    }
    throw err;
  });

  if (data && (data.error || data.status === false || data.success === false)) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (data.error && data.error.message) ||
      "Nguồn tải về trả về lỗi.";
    throw new ApiError(502, message);
  }

  return res.json({
    success: true,
    platform,
    query: rawQuery,
    result: data,
  });
}

export async function fetchMedia(req: Request, res: Response) {
  const { url, filename } = req.query as { url?: string; filename?: string };

  const parsedUrlString = requireHttpUrl(url, "url");
  if (filename && filename.trim()) {
    requireNonEmptyString(filename, "filename", { maxLength: 255 });
  }

  const parsed = new URL(parsedUrlString);
  if (isPrivateHostname(parsed.hostname)) {
    throw new ApiError(400, "Từ chối tải từ địa chỉ nội bộ.");
  }

  const controller = new AbortController();
  const connectTimeoutMs = Number(process.env.FETCH_MEDIA_TIMEOUT_MS) || 20_000;
  const timeoutTimer = setTimeout(() => controller.abort(), connectTimeoutMs);

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: `${parsed.protocol}//${parsed.host}/`,
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError(504, "Máy chủ phương tiện quá thời gian phản hồi.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutTimer);
  }

  if (!upstream.ok || !upstream.body) {
    throw new ApiError(502, `Máy chủ phương tiện trả về mã lỗi ${upstream.status}.`);
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const contentLength = upstream.headers.get("content-length");

  if (looksLikeFailurePayload(contentType)) {
    throw new ApiError(502, "Nguồn không trả về file media hợp lệ (trả về trang HTML/JSON lỗi).");
  }

  const baseName = (filename && filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_")) ||
    (parsed.pathname.split("/").pop() || "download").replace(/\.[a-z0-9]+$/i, "");

  const mimeBase = contentType.split(";")[0].trim().toLowerCase();
  const ext = EXT_BY_MIME[mimeBase];
  const safeName = ext ? `${baseName.replace(/\.[a-z0-9]+$/i, "")}.${ext}` : baseName;

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  if (contentLength) res.setHeader("Content-Length", contentLength);

  Readable.fromWeb(upstream.body as any).pipe(res);
}

export function downloaderHealth(req: Request, res: Response) {
  return res.json({ success: true, status: "ok", uptime: process.uptime() });
}
