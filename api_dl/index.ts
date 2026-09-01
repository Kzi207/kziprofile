import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import { searchYouTube, getYouTubeDownloadInfo, streamYouTubeMedia } from "./youtube.js";
import { searchSoundCloud, getSoundCloudDownloadInfo, streamSoundCloudMedia } from "./soundcloud.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

export interface ParsedDownloadInput {
  url: string;
  type: "mp3" | "mp4";
}

// Helper bóc tách tham số link download và loại file (mp3/mp4)
export function parseDownloadInput(rawInput: any, queryType?: any, queryFormat?: any): ParsedDownloadInput {
  let url = String(rawInput || "").trim();
  let type = (queryType || queryFormat || "").toLowerCase();

  if (/[\(\[\.]?mp4[\)\]]?$/i.test(url)) {
    if (!type) type = "mp4";
    url = url.replace(/[\(\[\.]?mp4[\)\]]?$/i, "").trim();
  } else if (/[\(\[\.]?mp3[\)\]]?$/i.test(url)) {
    if (!type) type = "mp3";
    url = url.replace(/[\(\[\.]?mp3[\)\]]?$/i, "").trim();
  } else if (/[\(\[\.]?\(?mp3,mp4\)?[\)\]]?$/i.test(url) || /[\(\[\.]?mp3,mp4[\)\]]?$/i.test(url)) {
    if (!type) type = "mp3";
    url = url.replace(/[\(\[\.]?\(?mp3,mp4\)?[\)\]]?$/i, "").trim();
  }

  if (type !== "mp4") {
    type = "mp3";
  }

  return { url, type: type as "mp3" | "mp4" };
}

// Hàm render giao diện tài liệu kết nối API
export function renderDocHTML(req: Request, res: Response) {
  const host = req.get("host") || "localhost:3000";
  const protocol = req.protocol || "http";
  const baseUrl = `${protocol}://${host}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Media Downloader API v1 - Tài Liệu Kết Nối</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #0b0f19;
          --card-bg: #151c2c;
          --card-border: #232e47;
          --primary: #38bdf8;
          --primary-glow: rgba(56, 189, 248, 0.25);
          --accent-yt: #ff0055;
          --accent-sc: #ff7700;
          --text-main: #f1f5f9;
          --text-muted: #94a3b8;
          --code-bg: #090d16;
          --badge-get: #10b981;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-main);
          color: var(--text-main);
          line-height: 1.6;
          padding: 30px 15px;
        }

        .container {
          max-width: 960px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px 20px;
          background: linear-gradient(135deg, rgba(21, 28, 44, 0.8) 0%, rgba(35, 46, 71, 0.4) 100%);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }

        .header h1 {
          font-size: 2.2rem;
          font-weight: 800;
          background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }

        .header p {
          color: var(--text-muted);
          font-size: 1.05rem;
        }

        .tag-version {
          display: inline-block;
          background: rgba(56, 189, 248, 0.15);
          color: var(--primary);
          border: 1px solid rgba(56, 189, 248, 0.3);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-top: 10px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 35px 0 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-title.yt { color: var(--accent-yt); }
        .section-title.sc { color: var(--accent-sc); }

        .endpoint-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .endpoint-card:hover {
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-2px);
        }

        .endpoint-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .method-badge {
          background: var(--badge-get);
          color: #fff;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .endpoint-path {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          font-size: 1.05rem;
          color: #e2e8f0;
        }

        .endpoint-desc {
          color: var(--text-muted);
          margin-bottom: 16px;
          font-size: 0.95rem;
        }

        .url-box {
          background: var(--code-bg);
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          word-break: break-all;
        }

        .url-box a {
          color: var(--primary);
          text-decoration: none;
        }

        .url-box a:hover {
          text-decoration: underline;
        }

        .btn-test {
          background: rgba(56, 189, 248, 0.1);
          color: var(--primary);
          border: 1px solid rgba(56, 189, 248, 0.3);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-test:hover {
          background: var(--primary);
          color: #0b0f19;
          box-shadow: 0 0 12px var(--primary-glow);
        }

        .footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid var(--card-border);
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎵 Media Downloader & Search API</h1>
          <p>Tài liệu kết nối RESTful API chính thức cho YouTube & SoundCloud v1</p>
          <span class="tag-version">GET /api/v1 • Link Tải Tồn Tại 15 Phút</span>
        </div>

        <!-- YOUTUBE SECTION -->
        <h2 class="section-title yt">▶️ YouTube Endpoints</h2>

        <!-- YT 1 -->
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge">GET</span>
            <span class="endpoint-path">/api/v1/youtube?search={keyword}</span>
          </div>
          <p class="endpoint-desc">1. Tìm kiếm bài hát trên YouTube hoặc lấy bài hát thịnh hành (Home) khi từ khóa rỗng.</p>

          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/youtube?search=Sơn Tùng M-TP</span>
            <a href="${baseUrl}/api/v1/youtube?search=Sơn Tùng M-TP" target="_blank" class="btn-test">Test API ↗</a>
          </div>
          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/youtube (Lấy bài hát thịnh hành)</span>
            <a href="${baseUrl}/api/v1/youtube" target="_blank" class="btn-test">Test API ↗</a>
          </div>
        </div>

        <!-- YT 2 -->
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge">GET</span>
            <span class="endpoint-path">/api/v1/youtube?download={link}&type={mp3|mp4}</span>
          </div>
          <p class="endpoint-desc">2. Lấy JSON Download Info (Tên bài hát, Tác giả, Thời lượng, Link tải hết hạn 15p).</p>

          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/youtube?download=https://youtu.be/boKJ5XDs_mY&type=mp3</span>
            <a href="${baseUrl}/api/v1/youtube?download=https://youtu.be/boKJ5XDs_mY&type=mp3" target="_blank" class="btn-test">Test MP3 ↗</a>
          </div>
          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/youtube?download=https://youtu.be/boKJ5XDs_mY&type=mp4</span>
            <a href="${baseUrl}/api/v1/youtube?download=https://youtu.be/boKJ5XDs_mY&type=mp4" target="_blank" class="btn-test">Test MP4 ↗</a>
          </div>
        </div>

        <!-- YT 3 -->
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge">GET</span>
            <span class="endpoint-path">/api/v1/youtube?stream={videoId}&type={mp3|mp4}</span>
          </div>
          <p class="endpoint-desc">3. Stream trực tiếp file âm thanh / video MP3 hoặc MP4.</p>

          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/youtube?stream=boKJ5XDs_mY&type=mp3</span>
            <a href="${baseUrl}/api/v1/youtube?stream=boKJ5XDs_mY&type=mp3" target="_blank" class="btn-test">Stream MP3 ↗</a>
          </div>
        </div>


        <!-- SOUNDCLOUD SECTION -->
        <h2 class="section-title sc">☁️ SoundCloud Endpoints</h2>

        <!-- SC 1 -->
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge">GET</span>
            <span class="endpoint-path">/api/v1/soundcloud?search={keyword}</span>
          </div>
          <p class="endpoint-desc">1. Tìm kiếm bài hát trên SoundCloud hoặc lấy danh sách nhạc trẻ thịnh hành khi không truyền từ khóa.</p>

          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/soundcloud?search=Lưu Niên</span>
            <a href="${baseUrl}/api/v1/soundcloud?search=Lưu Niên" target="_blank" class="btn-test">Test API ↗</a>
          </div>
          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/soundcloud (Lấy bài hát thịnh hành)</span>
            <a href="${baseUrl}/api/v1/soundcloud" target="_blank" class="btn-test">Test API ↗</a>
          </div>
        </div>

        <!-- SC 2 -->
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge">GET</span>
            <span class="endpoint-path">/api/v1/soundcloud?download={link}</span>
          </div>
          <p class="endpoint-desc">2. Lấy JSON Download Info (Tên bài hát, Tác giả, Link tải MP3 hết hạn 15p).</p>

          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/soundcloud?download=https://soundcloud.com/nhu-nhu-839205400/nh-m-t-ng-i-d-ng-remix</span>
            <a href="${baseUrl}/api/v1/soundcloud?download=https://soundcloud.com/nhu-nhu-839205400/nh-m-t-ng-i-d-ng-remix" target="_blank" class="btn-test">Test JSON ↗</a>
          </div>
        </div>

        <!-- SC 3 -->
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge">GET</span>
            <span class="endpoint-path">/api/v1/soundcloud?stream={trackId}</span>
          </div>
          <p class="endpoint-desc">3. Stream tải trực tiếp file MP3 từ SoundCloud.</p>

          <div class="url-box">
            <span>GET ${baseUrl}/api/v1/soundcloud?stream=1959700875</span>
            <a href="${baseUrl}/api/v1/soundcloud?stream=1959700875" target="_blank" class="btn-test">Stream MP3 ↗</a>
          </div>
        </div>

        <div class="footer">
          <p>Media Downloader API • Version 1.0.0 • Portfolio API Documentation</p>
        </div>
      </div>
    </body>
    </html>
  `);
}

// Route trang tài liệu kết nối
app.get("/api/v1", (req: Request, res: Response) => renderDocHTML(req, res));
app.get("/api/v1/", (req: Request, res: Response) => renderDocHTML(req, res));
app.get("/", (req: Request, res: Response) => renderDocHTML(req, res));

// YouTube Stream Endpoint
app.get("/api/v1/youtube/stream/:filename", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const type = filename.endsWith(".mp4") ? "mp4" : "mp3";
    const input = filename.replace(/\.(mp3|mp4)$/i, "");
    return await streamYouTubeMedia(req, res, input, type);
  } catch (error) {
    next(error);
  }
});

// YouTube API Endpoint
app.get("/api/v1/youtube", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, download, stream, type, format } = req.query as any;

    if (stream) {
      const parsed = parseDownloadInput(stream, type, format);
      return await streamYouTubeMedia(req, res, parsed.url, parsed.type);
    }

    if (download) {
      const parsed = parseDownloadInput(download, type, format);
      const info = await getYouTubeDownloadInfo(req, parsed.url, parsed.type);
      return res.status(info.status ? 200 : 400).json(info);
    }

    const data = await searchYouTube(search);
    return res.status(data.status ? 200 : 400).json(data);
  } catch (error) {
    next(error);
  }
});

// SoundCloud Stream Endpoint
app.get("/api/v1/soundcloud/stream/:filename", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const input = filename.replace(/\.mp3$/i, "");
    return await streamSoundCloudMedia(req, res, input);
  } catch (error) {
    next(error);
  }
});

// SoundCloud API Endpoint
app.get("/api/v1/soundcloud", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, download, stream, type, format } = req.query as any;

    if (stream) {
      const parsed = parseDownloadInput(stream, type, format);
      return await streamSoundCloudMedia(req, res, parsed.url);
    }

    if (download) {
      const parsed = parseDownloadInput(download, type, format);
      const info = await getSoundCloudDownloadInfo(req, parsed.url, parsed.type);
      return res.status(info.status ? 200 : 400).json(info);
    }

    const data = await searchSoundCloud(search);
    return res.status(data.status ? 200 : 400).json(data);
  } catch (error) {
    next(error);
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("API Error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      status: false,
      message: err.message || "Lỗi server nội bộ."
    });
  }
});

export default app;
