import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import { searchYouTube, getYouTubeDownloadInfo, streamYouTubeMedia, getBaseUrl } from "./youtube.js";
import { searchSoundCloud, getSoundCloudDownloadInfo, streamSoundCloudMedia } from "./soundcloud.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", true);
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
  const baseUrl = getBaseUrl(req);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Portfolio System & Media Downloader API v1 - Full Documentation</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #090d16;
          --card-bg: #111827;
          --card-border: #1f293d;
          --primary: #38bdf8;
          --primary-glow: rgba(56, 189, 248, 0.25);
          --accent-green: #10b981;
          --accent-purple: #c084fc;
          --accent-orange: #f97316;
          --accent-pink: #ec4899;
          --accent-yellow: #eab308;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --code-bg: #050811;
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
          max-width: 1040px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 35px;
          padding: 36px 20px;
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(30, 41, 59, 0.6) 100%);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        }

        .header h1 {
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 800;
          background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }

        .header p {
          color: var(--text-muted);
          font-size: 1.05rem;
          max-width: 780px;
          margin: 0 auto;
        }

        .top-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .tag-version {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(56, 189, 248, 0.15);
          color: var(--primary);
          border: 1px solid rgba(56, 189, 248, 0.3);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .btn-tester {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(90deg, #10b981, #059669);
          color: #fff;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-tester:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
        }

        .category-header {
          font-size: 1.35rem;
          font-weight: 700;
          margin: 40px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid var(--card-border);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .category-header.media { color: var(--primary); border-color: rgba(56, 189, 248, 0.3); }
        .category-header.chill { color: var(--accent-pink); border-color: rgba(236, 72, 153, 0.3); }
        .category-header.portfolio { color: var(--accent-purple); border-color: rgba(192, 132, 252, 0.3); }
        .category-header.auth { color: var(--accent-orange); border-color: rgba(249, 115, 22, 0.3); }

        .endpoint-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 18px 22px;
          margin-bottom: 16px;
        }

        .endpoint-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .method-badge {
          font-weight: 700;
          font-size: 0.75rem;
          padding: 3px 9px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .method-badge.get { background: var(--accent-green); color: #051a10; }
        .method-badge.post { background: var(--primary); color: #03141d; }
        .method-badge.put { background: var(--accent-orange); color: #1a0b02; }
        .method-badge.patch { background: var(--accent-yellow); color: #1c1502; }
        .method-badge.delete { background: #ef4444; color: #fff; }

        .endpoint-path {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          font-size: 0.98rem;
          color: #f1f5f9;
        }

        .endpoint-desc {
          color: var(--text-muted);
          margin-bottom: 10px;
          font-size: 0.9rem;
        }

        .url-box {
          background: var(--code-bg);
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.84rem;
          word-break: break-all;
        }

        .url-box a {
          color: var(--primary);
          text-decoration: none;
          white-space: nowrap;
        }
        .url-box a:hover { text-decoration: underline; }

        .platforms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .platform-badge {
          background: var(--code-bg);
          border: 1px solid var(--card-border);
          border-radius: 8px;
          padding: 8px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .platform-badge span {
          color: var(--accent-purple);
          font-size: 0.72rem;
        }

        footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid var(--card-border);
          color: var(--text-muted);
          font-size: 0.85rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ Full System REST API Documentation</h1>
          <p>Tài liệu tổng hợp ĐẦY ĐỦ tất cả các API đang hoạt động của hệ thống (Portfolio, Entertainment & Multi-Platform Media Downloader)</p>
          <div class="top-actions">
            <span class="tag-version">GET /api/v1 • Full API Suite</span>
            <a href="/downloader/" class="btn-tester" target="_blank">🖥️ Mở Endpoint Tester UI</a>
          </div>
        </div>

        <!-- CATEGORY 1: MEDIA DOWNLOADER -->
        <h2 class="category-header media">📥 1. Multi-Platform Media Downloader API</h2>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/:platform?url={LINK_HOAC_TU_KHOA}</span>
          </div>
          <div class="endpoint-desc">Tải dữ liệu media theo nền tảng chỉ định (hoặc từ khóa <code>?search=</code> / <code>?url=</code>). Hỗ trợ 17+ nền tảng mạng xã hội.</div>
          
          <div class="url-box">
            <span>${baseUrl}/api/v1/youtube?url=https://youtu.be/dQw4w9WgXcQ</span>
            <a href="${baseUrl}/api/v1/youtube?url=https://youtu.be/dQw4w9WgXcQ" target="_blank">Test YouTube</a>
          </div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/tiktok?url=https://www.tiktok.com/@scout2015/video/6718335390845095173</span>
            <a href="${baseUrl}/api/v1/tiktok?url=https://www.tiktok.com/@scout2015/video/6718335390845095173" target="_blank">Test TikTok</a>
          </div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/soundcloud?url=https://soundcloud.com/octobersveryown/drake-hotline-bling</span>
            <a href="${baseUrl}/api/v1/soundcloud?url=https://soundcloud.com/octobersveryown/drake-hotline-bling" target="_blank">Test SoundCloud</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/platforms</span>
          </div>
          <div class="endpoint-desc">Lấy danh sách tất cả các nền tảng truyền thông được hệ thống hỗ trợ.</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/platforms</span>
            <a href="${baseUrl}/api/v1/platforms" target="_blank">Xem danh sách</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/fetch-media?url={DIRECT_URL}&filename={NAME}</span>
          </div>
          <div class="endpoint-desc">Proxy tải file phương tiện trực tiếp về máy an toàn, tự động nhận diện MIME type.</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/fetch-media?url=...&filename=file_tai_ve</span>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/health</span>
          </div>
          <div class="endpoint-desc">Kiểm tra trạng thái máy chủ Downloader API.</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/health</span>
            <a href="${baseUrl}/api/v1/health" target="_blank">Health Check</a>
          </div>
        </div>

        <h3 style="font-size:1rem; color:var(--text-muted); margin-top:10px;">Nền tảng hỗ trợ trong <code>:platform</code>:</h3>
        <div class="platforms-grid">
          <div class="platform-badge">youtube <span>video/audio</span></div>
          <div class="platform-badge">tiktok <span>video/audio</span></div>
          <div class="platform-badge">soundcloud <span>audio</span></div>
          <div class="platform-badge">facebook <span>video</span></div>
          <div class="platform-badge">instagram <span>reel/post</span></div>
          <div class="platform-badge">twitter <span>video/photo</span></div>
          <div class="platform-badge">spotify <span>track</span></div>
          <div class="platform-badge">pinterest <span>image/video</span></div>
          <div class="platform-badge">capcut <span>template</span></div>
          <div class="platform-badge">douyin <span>video</span></div>
          <div class="platform-badge">xiaohongshu <span>note/video</span></div>
          <div class="platform-badge">mediafire <span>file</span></div>
          <div class="platform-badge">gdrive <span>file</span></div>
          <div class="platform-badge">snackvideo <span>video</span></div>
          <div class="platform-badge">cocofun <span>video</span></div>
          <div class="platform-badge">aio <span>auto-detect</span></div>
        </div>

        <!-- CATEGORY 2: ENTERTAINMENT & RANDOM MEDIA -->
        <h2 class="category-header chill">🎧 2. Random Media & Entertainment API</h2>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/chill</span>
          </div>
          <div class="endpoint-desc">Lấy ngẫu nhiên 1 video/nhạc Chill, Lofi thư giãn.</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/chill</span>
            <a href="${baseUrl}/api/v1/chill" target="_blank">Thử /chill</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/anime</span>
          </div>
          <div class="endpoint-desc">Lấy ngẫu nhiên video AMV / Anime nổi bật.</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/anime</span>
            <a href="${baseUrl}/api/v1/anime" target="_blank">Thử /anime</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/gai</span>
          </div>
          <div class="endpoint-desc">Lấy ngẫu nhiên link ảnh/video gái xinh ngẫu nhiên.</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/gai</span>
            <a href="${baseUrl}/api/v1/gai" target="_blank">Thử /gai</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/v1/music</span>
          </div>
          <div class="endpoint-desc">Lấy bài hát ngẫu nhiên hoặc toàn bộ danh sách nhạc (truyền <code>?all=true</code>).</div>
          <div class="url-box">
            <span>${baseUrl}/api/v1/music</span>
            <a href="${baseUrl}/api/v1/music" target="_blank">Thử /music</a>
          </div>
        </div>

        <!-- CATEGORY 3: PORTFOLIO CORE SYSTEM -->
        <h2 class="category-header portfolio">📂 3. Portfolio Management Core API</h2>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/profile</span>
            <span class="method-badge put">PUT</span>
            <span class="endpoint-path">/api/profile</span>
          </div>
          <div class="endpoint-desc">Lấy thông tin cá nhân hoặc cập nhật hồ sơ cá nhân / mật khẩu (Yêu cầu Token cho PUT).</div>
          <div class="url-box">
            <span>${baseUrl}/api/profile</span>
            <a href="${baseUrl}/api/profile" target="_blank">Xem Profile</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge put">PUT</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/projects [/:id]</span>
          </div>
          <div class="endpoint-desc">Quản lý danh sách dự án (Lấy danh sách, tạo dự án mới, cập nhật, xóa dự án).</div>
          <div class="url-box">
            <span>${baseUrl}/api/projects</span>
            <a href="${baseUrl}/api/projects" target="_blank">Xem Dự Án</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge put">PUT</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/skills [/:id]</span>
          </div>
          <div class="endpoint-desc">Quản lý kỹ năng chuyên môn (Frontend, Backend, Database, Cloud, AI, Tools).</div>
          <div class="url-box">
            <span>${baseUrl}/api/skills</span>
            <a href="${baseUrl}/api/skills" target="_blank">Xem Kỹ Năng</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge put">PUT</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/experiences [/:id]</span>
          </div>
          <div class="endpoint-desc">Quản lý lịch sử kinh nghiệm làm việc.</div>
          <div class="url-box">
            <span>${baseUrl}/api/experiences</span>
            <a href="${baseUrl}/api/experiences" target="_blank">Xem Kinh Nghiệm</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge put">PUT</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/roadmaps [/:id]</span>
          </div>
          <div class="endpoint-desc">Quản lý lộ trình học tập & định hướng tương lai.</div>
          <div class="url-box">
            <span>${baseUrl}/api/roadmaps</span>
            <a href="${baseUrl}/api/roadmaps" target="_blank">Xem Lộ Trình</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge put">PUT</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/certificates [/:id]</span>
          </div>
          <div class="endpoint-desc">Quản lý bằng cấp và chứng chỉ.</div>
          <div class="url-box">
            <span>${baseUrl}/api/certificates</span>
            <a href="${baseUrl}/api/certificates" target="_blank">Xem Chứng Chỉ</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge patch">PATCH</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/messages [/:id]</span>
          </div>
          <div class="endpoint-desc">Gửi tin nhắn liên hệ từ khách truy cập và quản lý hộp thư trong Admin.</div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="method-badge post">POST</span>
            <span class="method-badge put">PUT</span>
            <span class="method-badge delete">DELETE</span>
            <span class="endpoint-path">/api/photos [/:id]</span>
          </div>
          <div class="endpoint-desc">Quản lý thư viện ảnh Cloudinary (Tìm kiếm <code>?q=</code>, phân trang, lọc theo định dạng).</div>
          <div class="url-box">
            <span>${baseUrl}/api/photos</span>
            <a href="${baseUrl}/api/photos" target="_blank">Xem Thư Viện Ảnh</a>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/dashboard</span>
          </div>
          <div class="endpoint-desc">Thống kê dữ liệu tổng quan cho trang quản trị Admin.</div>
        </div>

        <!-- CATEGORY 4: AUTH & SYSTEM SETTINGS -->
        <h2 class="category-header auth">🔑 4. Authentication & System Settings API</h2>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge post">POST</span>
            <span class="endpoint-path">/api/auth/login</span>
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/auth/me</span>
          </div>
          <div class="endpoint-desc">Đăng nhập tài khoản quản trị lấy JWT Token hoặc xác thực Token hiện tại.</div>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method-badge get">GET</span>
            <span class="endpoint-path">/api/settings</span>
            <span class="method-badge put">PUT</span>
            <span class="endpoint-path">/api/settings</span>
          </div>
          <div class="endpoint-desc">Lấy hoặc cập nhật thông số cài đặt hệ thống (Cấu hình link chill, music, gái xinh...).</div>
          <div class="url-box">
            <span>${baseUrl}/api/settings</span>
            <a href="${baseUrl}/api/settings" target="_blank">Xem Cài Đặt</a>
          </div>
        </div>

        <footer>
          <p>© 2026 Anime Cyberpunk Portfolio System. All APIs fully operational.</p>
        </footer>
      </div>
    </body>
    </html>
  `);
}

// Route trang tài liệu kết nối
app.get(["/api/v1", "/api/v1/", "/apiv1", "/apiv1/", "/v1", "/v1/"], (req: Request, res: Response) => renderDocHTML(req, res));
app.get("/", (req: Request, res: Response) => renderDocHTML(req, res));

// YouTube Stream Endpoint
app.get(["/api/v1/youtube/stream/:filename", "/apiv1/youtube/stream/:filename", "/v1/youtube/stream/:filename"], async (req: Request, res: Response, next: NextFunction) => {
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
app.get(["/api/v1/youtube", "/apiv1/youtube", "/v1/youtube"], async (req: Request, res: Response, next: NextFunction) => {
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
app.get(["/api/v1/soundcloud/stream/:filename", "/apiv1/soundcloud/stream/:filename", "/v1/soundcloud/stream/:filename"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const input = filename.replace(/\.mp3$/i, "");
    return await streamSoundCloudMedia(req, res, input);
  } catch (error) {
    next(error);
  }
});

// SoundCloud API Endpoint
app.get(["/api/v1/soundcloud", "/apiv1/soundcloud", "/v1/soundcloud"], async (req: Request, res: Response, next: NextFunction) => {
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
