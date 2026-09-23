import express, { Request, Response, NextFunction } from "express";
import path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import dotenv from "dotenv";
import cors from "cors";
import { CHILL_LINKS_DEFAULT } from "./src/data/chill_links.js";
import { GAI_LINKS_DEFAULT } from "./src/data/gai_links.js";
import { MUSIC_LINKS_DEFAULT } from "./src/data/music_links.js";
import { v2 as cloudinary } from "cloudinary";
import { searchYouTube, getYouTubeDownloadInfo, streamYouTubeMedia, getYouTubePlayInfo, getYtDlpDirectUrl, extractVideoId, getYouTubeMetadata, cleanName, formatDuration } from "./api_dl/youtube.js";
import { searchSoundCloud, getSoundCloudDownloadInfo, streamSoundCloudMedia } from "./api_dl/soundcloud.js";
import { parseDownloadInput, renderDocHTML } from "./api_dl/index.js";
import {
  listPlatforms,
  downloadPlatformMedia,
  fetchMedia,
  downloaderHealth,
  ApiError,
} from "./api_dl/btch.js";
import rateLimit from "express-rate-limit";



// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let prismaInstance: PrismaClient | null = null;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!prismaInstance) {
      prismaInstance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Peua73jJWTUy@ep-red-mountain-at5zo714-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
          },
        },
      });
    }
    const value = Reflect.get(prismaInstance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(prismaInstance);
    }
    return value;
  },
});
const app = express();
app.set("trust proxy", true);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "anime_cyberpunk_neon_secret_key_2026";

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Increase payload limit for base64 uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Helper standard response
function sendResponse(res: Response, status: number, success: boolean, message: string, data: any = null) {
  return res.status(status).json({ success, message, data });
}

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    sendResponse(res, 401, false, "Truy cập bị từ chối. Token không tồn tại.");
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; username: string; email: string };
    req.user = verified;
    next();
  } catch (err) {
    sendResponse(res, 403, false, "Token không hợp lệ hoặc đã hết hạn.");
    return;
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// --- AUTHENTICATION ---
const loginSchema = z.object({
  username: z.string().min(3, "Tài khoản tối thiểu 3 ký tự"),
  password: z.string().min(5, "Mật khẩu tối thiểu 5 ký tự"),
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return sendResponse(res, 401, false, "Tài khoản hoặc mật khẩu không đúng.");
    }

    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) {
      return sendResponse(res, 401, false, "Tài khoản hoặc mật khẩu không đúng.");
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user;
    return sendResponse(res, 200, true, "Đăng nhập thành công!", {
      token,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi đăng nhập: " + error.message);
  }
});

app.get("/api/auth/me", authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
    });
    if (!user) {
      return sendResponse(res, 404, false, "Người dùng không tồn tại.");
    }
    const { password: _, ...userWithoutPassword } = user;
    return sendResponse(res, 200, true, "Xác thực thành công", userWithoutPassword);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi xác thực: " + error.message);
  }
});

// --- CHILL MUSIC RANDOM API ---

app.get(["/api/v1/chill", "/apiv1/chill", "/v1/chill"], async (req: Request, res: Response) => {
  let links = CHILL_LINKS_DEFAULT;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "music_links" } });
    if (setting && setting.value && setting.value.trim() !== "") {
      const dbLinks = setting.value
        .split(",")
        .map((link) => link.trim())
        .filter((link) => link !== "");
      if (dbLinks.length > 0) {
        links = dbLinks;
      }
    }
  } catch (error: any) {
    console.warn("Lỗi database tại /api/v1/chill, dùng links mặc định:", error.message);
  }
  const randomLink = links[Math.floor(Math.random() * links.length)];
  return res.status(200).json({ url: randomLink });
});

app.get(["/api/v1/anime", "/apiv1/anime", "/v1/anime"], async (req: Request, res: Response) => {
  let links = CHILL_LINKS_DEFAULT;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "music_links" } });
    if (setting && setting.value && setting.value.trim() !== "") {
      const dbLinks = setting.value
        .split(",")
        .map((link) => link.trim())
        .filter((link) => link !== "");
      if (dbLinks.length > 0) {
        links = dbLinks;
      }
    }
  } catch (error: any) {
    console.warn("Lỗi database tại /api/v1/anime, dùng links mặc định:", error.message);
  }
  const randomLink = links[Math.floor(Math.random() * links.length)];
  return res.status(200).json({ url: randomLink });
});

app.get(["/api/v1/gai", "/apiv1/gai", "/v1/gai"], async (req: Request, res: Response) => {
  let links = GAI_LINKS_DEFAULT;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "gai_links" } });
    if (setting && setting.value && setting.value.trim() !== "") {
      const dbLinks = setting.value
        .split(",")
        .map((link) => link.trim())
        .filter((link) => link !== "");
      if (dbLinks.length > 0) {
        links = dbLinks;
      }
    }
  } catch (error: any) {
    console.warn("Lỗi database tại /api/v1/gai, dùng links mặc định:", error.message);
  }
  const randomLink = links[Math.floor(Math.random() * links.length)];
  return res.status(200).json({ url: randomLink });
});

app.get(["/api/v1/music", "/apiv1/music", "/v1/music"], async (req: Request, res: Response) => {
  let list = MUSIC_LINKS_DEFAULT;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "music_v1_list" } });
    if (setting && setting.value && setting.value.trim() !== "") {
      try {
        const dbList = JSON.parse(setting.value);
        if (Array.isArray(dbList) && dbList.length > 0) {
          list = dbList;
        }
      } catch (jsonErr) {
        console.warn("Lỗi parse JSON music_v1_list:", jsonErr);
      }
    }
  } catch (error: any) {
    console.warn("Lỗi database tại /api/v1/music, dùng mặc định:", error.message);
  }
  if (req.query.all === "true" || req.query.type === "all") {
    return res.status(200).json(list);
  }
  const randomSong = list[Math.floor(Math.random() * list.length)];
  return res.status(200).json(randomSong);
});

app.get(["/api/v1/music/random", "/apiv1/music/random", "/v1/music/random"], async (req: Request, res: Response) => {
  let list = MUSIC_LINKS_DEFAULT;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "music_v1_list" } });
    if (setting && setting.value && setting.value.trim() !== "") {
      try {
        const dbList = JSON.parse(setting.value);
        if (Array.isArray(dbList) && dbList.length > 0) {
          list = dbList;
        }
      } catch (jsonErr) {
        console.warn("Lỗi parse JSON music_v1_list:", jsonErr);
      }
    }
  } catch (error: any) {
    console.warn("Lỗi database tại /api/v1/music/random, dùng mặc định:", error.message);
  }
  const randomSong = list[Math.floor(Math.random() * list.length)];
  return res.status(200).json(randomSong);
});

// --- PROFILE ---
app.get("/api/profile", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return sendResponse(res, 404, false, "Profile chưa được khởi tạo.");
    }
    const { password: _, ...profile } = user;
    return sendResponse(res, 200, true, "Lấy profile thành công", profile);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy thông tin profile: " + error.message);
  }
});

const profileUpdateSchema = z.object({
  name: z.string().min(1, "Họ tên không được để trống"),
  nickname: z.string().optional(),
  avatar: z.string().optional(),
  birthday: z.string().optional(),
  email: z.string().email("Email không hợp lệ"),
  address: z.string().optional(),
  bio: z.string().optional(),
  socialGithub: z.string().optional(),
  socialLinkedin: z.string().optional(),
  socialTwitter: z.string().optional(),
  newPassword: z.string().min(5, "Mật khẩu mới tối thiểu 5 ký tự").optional().or(z.literal("")),
});

app.put("/api/profile", authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }

    const currentProfile = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!currentProfile) {
      return sendResponse(res, 404, false, "Không tìm thấy người dùng hiện tại.");
    }

    const { newPassword, ...updateData } = parsed.data;

    let finalPassword = currentProfile.password;
    if (newPassword && newPassword.trim() !== "") {
      finalPassword = bcryptjs.hashSync(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.user?.id },
      data: {
        ...updateData,
        password: finalPassword,
      },
    });

    const { password: _, ...profileWithoutPassword } = updated;
    return sendResponse(res, 200, true, "Cập nhật thông tin profile thành công!", profileWithoutPassword);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật profile: " + error.message);
  }
});

// --- SKILLS ---
const skillSchema = z.object({
  name: z.string().min(1, "Tên kỹ năng không được để trống"),
  category: z.enum(["Frontend", "Backend", "Database", "Cloud", "AI", "Tools"]),
  level: z.number().min(0).max(100),
  iconName: z.string().optional(),
});

app.get("/api/skills", async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: [{ category: "asc" }, { level: "desc" }],
    });
    return sendResponse(res, 200, true, "Lấy danh sách kỹ năng thành công", skills);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy danh sách kỹ năng: " + error.message);
  }
});

app.post("/api/skills", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const parsed = skillSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const skill = await prisma.skill.create({ data: parsed.data });
    return sendResponse(res, 201, true, "Thêm kỹ năng mới thành công!", skill);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi thêm kỹ năng: " + error.message);
  }
});

app.put("/api/skills/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = skillSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const skill = await prisma.skill.update({
      where: { id },
      data: parsed.data,
    });
    return sendResponse(res, 200, true, "Cập nhật kỹ năng thành công!", skill);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật kỹ năng: " + error.message);
  }
});

app.delete("/api/skills/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.skill.delete({ where: { id } });
    return sendResponse(res, 200, true, "Xóa kỹ năng thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa kỹ năng: " + error.message);
  }
});

// --- ROADMAPS ---
const roadmapSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  description: z.string().optional(),
  status: z.enum(["Completed", "Learning", "Future"]),
  order: z.number().default(0),
  date: z.string().optional(),
});

app.get("/api/roadmaps", async (req: Request, res: Response) => {
  try {
    const roadmaps = await prisma.roadmap.findMany({
      orderBy: { order: "asc" },
    });
    return sendResponse(res, 200, true, "Lấy roadmap thành công", roadmaps);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy roadmap: " + error.message);
  }
});

app.post("/api/roadmaps", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const parsed = roadmapSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const roadmap = await prisma.roadmap.create({ data: parsed.data });
    return sendResponse(res, 201, true, "Thêm lộ trình thành công!", roadmap);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi tạo lộ trình: " + error.message);
  }
});

app.put("/api/roadmaps/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = roadmapSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const roadmap = await prisma.roadmap.update({
      where: { id },
      data: parsed.data,
    });
    return sendResponse(res, 200, true, "Cập nhật lộ trình thành công!", roadmap);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật lộ trình: " + error.message);
  }
});

app.delete("/api/roadmaps/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.roadmap.delete({ where: { id } });
    return sendResponse(res, 200, true, "Xóa lộ trình thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa lộ trình: " + error.message);
  }
});

// --- EXPERIENCES ---
const experienceSchema = z.object({
  company: z.string().min(1, "Tên công ty không được để trống"),
  position: z.string().min(1, "Vị trí không được để trống"),
  description: z.string().min(1, "Mô tả không được để trống"),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  current: z.boolean().default(false),
});

app.get("/api/experiences", async (req: Request, res: Response) => {
  try {
    const experiences = await prisma.experience.findMany({
      orderBy: { startDate: "desc" },
    });
    return sendResponse(res, 200, true, "Lấy danh sách kinh nghiệm thành công", experiences);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy kinh nghiệm: " + error.message);
  }
});

app.post("/api/experiences", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const parsed = experienceSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const experience = await prisma.experience.create({ data: parsed.data as any });
    return sendResponse(res, 201, true, "Thêm kinh nghiệm thành công!", experience);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi thêm kinh nghiệm: " + error.message);
  }
});

app.put("/api/experiences/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = experienceSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const experience = await prisma.experience.update({
      where: { id },
      data: parsed.data as any,
    });
    return sendResponse(res, 200, true, "Cập nhật kinh nghiệm thành công!", experience);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật kinh nghiệm: " + error.message);
  }
});

app.delete("/api/experiences/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.experience.delete({ where: { id } });
    return sendResponse(res, 200, true, "Xóa kinh nghiệm thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa kinh nghiệm: " + error.message);
  }
});

// --- CERTIFICATES ---
const certificateSchema = z.object({
  name: z.string().min(1, "Tên chứng chỉ không được để trống"),
  issuer: z.string().min(1, "Đơn vị cấp không được để trống"),
  issueDate: z.string(),
  credentialUrl: z.string().optional(),
  imageUrl: z.string().optional(),
});

app.get("/api/certificates", async (req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      orderBy: { issueDate: "desc" },
    });
    return sendResponse(res, 200, true, "Lấy danh sách chứng chỉ thành công", certificates);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy chứng chỉ: " + error.message);
  }
});

app.post("/api/certificates", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const parsed = certificateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const certificate = await prisma.certificate.create({ data: parsed.data });
    return sendResponse(res, 201, true, "Thêm chứng chỉ thành công!", certificate);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi thêm chứng chỉ: " + error.message);
  }
});

app.put("/api/certificates/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = certificateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const certificate = await prisma.certificate.update({
      where: { id },
      data: parsed.data,
    });
    return sendResponse(res, 200, true, "Cập nhật chứng chỉ thành công!", certificate);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật chứng chỉ: " + error.message);
  }
});

app.delete("/api/certificates/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.certificate.delete({ where: { id } });
    return sendResponse(res, 200, true, "Xóa chứng chỉ thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa chứng chỉ: " + error.message);
  }
});

// --- PROJECTS ---
const projectSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  description: z.string().min(1, "Mô tả không được để trống"),
  thumbnail: z.string().min(1, "Ảnh thu nhỏ không được để trống"),
  gallery: z.array(z.string()).default([]),
  githubUrl: z.string().nullable().optional(),
  demoUrl: z.string().nullable().optional(),
  techStack: z.array(z.string()).min(1, "Hãy chọn ít nhất một công nghệ"),
  category: z.string().min(1, "Hãy chọn một danh mục"),
});

app.get("/api/projects", async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    return sendResponse(res, 200, true, "Lấy danh sách dự án thành công", projects);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy danh sách dự án: " + error.message);
  }
});

app.post("/api/projects", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const project = await prisma.project.create({ data: parsed.data });
    return sendResponse(res, 201, true, "Thêm dự án mới thành công!", project);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi tạo dự án: " + error.message);
  }
});

app.put("/api/projects/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });
    return sendResponse(res, 200, true, "Cập nhật dự án thành công!", project);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật dự án: " + error.message);
  }
});

app.delete("/api/projects/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    return sendResponse(res, 200, true, "Xóa dự án thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa dự án: " + error.message);
  }
});

// --- MESSAGES (Contact) ---
const messageSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên của bạn"),
  email: z.string().email("Vui lòng nhập đúng email"),
  subject: z.string().min(1, "Vui lòng nhập chủ đề"),
  message: z.string().min(5, "Nội dung tin nhắn phải từ 5 ký tự trở lên"),
});

app.post("/api/messages", async (req: Request, res: Response) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const msg = await prisma.message.create({ data: parsed.data });
    return sendResponse(res, 201, true, "Tin nhắn của bạn đã được gửi thành công! Cảm ơn bạn.", msg);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Không thể gửi tin nhắn lúc này: " + error.message);
  }
});

app.get("/api/messages", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
    });
    return sendResponse(res, 200, true, "Lấy danh sách tin nhắn thành công", messages);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi lấy tin nhắn: " + error.message);
  }
});

app.patch("/api/messages/:id/read", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    const updated = await prisma.message.update({
      where: { id },
      data: { read: !!read },
    });
    return sendResponse(res, 200, true, "Cập nhật trạng thái tin nhắn thành công!", updated);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi cập nhật tin nhắn: " + error.message);
  }
});

app.delete("/api/messages/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.message.delete({ where: { id } });
    return sendResponse(res, 200, true, "Xóa tin nhắn thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa tin nhắn: " + error.message);
  }
});

// --- SETTINGS ---
app.get("/api/settings", async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    return sendResponse(res, 200, true, "Lấy cài đặt thành công", settingsMap);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi lấy cài đặt: " + error.message);
  }
});

app.put("/api/settings", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const updates = req.body; // Key-value object
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    return sendResponse(res, 200, true, "Cập nhật cài đặt thành công!", settingsMap);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi cập nhật cài đặt: " + error.message);
  }
});

// --- IMAGE UPLOAD (Mock / Fallback Proxy to handle image URLs or local Base64 mock storage) ---
app.post("/api/upload", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { url, base64 } = req.body;
    if (base64) {
      // Return local data URI representation for base64
      return sendResponse(res, 200, true, "Tải ảnh lên thành công (Local Storage)!", base64);
    }
    if (url) {
      return sendResponse(res, 200, true, "Tải ảnh lên thành công!", url);
    }
    // Return a beautiful unsplash fallback placeholder
    const placeholder = `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80`;
    return sendResponse(res, 200, true, "Dùng ảnh mặc định thành công!", placeholder);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi upload ảnh: " + error.message);
  }
});


// --- PHOTOS MODULE ---
const photoCreateSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  file: z.string().min(1, "File ảnh base64 không được để trống"),
});

const photoUpdateSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

app.post("/api/photos", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const parsed = photoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }
    const { title, description, tags, file } = parsed.data;

    const uploadRes = await cloudinary.uploader.upload(file, {
      folder: "cyberpunk_portfolio",
    });

    const photo = await prisma.photo.create({
      data: {
        title,
        description: description || "",
        tags,
        cloudinaryPublicId: uploadRes.public_id,
        secureUrl: uploadRes.secure_url,
        width: uploadRes.width,
        height: uploadRes.height,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
      },
    });

    return sendResponse(res, 201, true, "Đăng ảnh lên thành công!", photo);
  } catch (error: any) {
    console.error("Lỗi upload ảnh:", error);
    return sendResponse(res, 500, false, "Lỗi khi upload ảnh: " + error.message);
  }
});

app.get("/api/photos", async (req: Request, res: Response) => {
  try {
    const { q, format, date, sortBy = "createdAt", sortOrder = "desc", page = "1", limit = "12" } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 12;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (q && String(q).trim() !== "") {
      const searchStr = String(q).trim();
      where.OR = [
        { title: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
        { tags: { has: searchStr } },
      ];
    }

    if (format && String(format).trim() !== "") {
      where.format = { equals: String(format).toLowerCase() };
    }

    if (date && String(date).trim() !== "") {
      const now = new Date();
      if (date === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.createdAt = { gte: today };
      } else if (date === "week") {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: lastWeek };
      } else if (date === "month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        where.createdAt = { gte: lastMonth };
      }
    }

    let orderBy: any = {};
    if (sortBy === "title") {
      orderBy = { title: sortOrder === "desc" ? "desc" : "asc" };
    } else if (sortBy === "size") {
      orderBy = { bytes: sortOrder === "desc" ? "desc" : "asc" };
    } else if (sortBy === "oldest") {
      orderBy = { createdAt: "asc" };
    } else {
      orderBy = { createdAt: "desc" };
    }

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.photo.count({ where }),
    ]);

    return sendResponse(res, 200, true, "Lấy danh sách ảnh thành công", {
      photos,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy danh sách ảnh: " + error.message);
  }
});

app.get("/api/photos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return sendResponse(res, 404, false, "Không tìm thấy ảnh.");
    }
    return sendResponse(res, 200, true, "Lấy chi tiết ảnh thành công", photo);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi lấy chi tiết ảnh: " + error.message);
  }
});

app.put("/api/photos/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = photoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendResponse(res, 400, false, parsed.error.issues[0].message);
    }

    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return sendResponse(res, 404, false, "Không tìm thấy ảnh để chỉnh sửa.");
    }

    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: parsed.data,
    });

    return sendResponse(res, 200, true, "Cập nhật thông tin ảnh thành công!", updatedPhoto);
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi cập nhật ảnh: " + error.message);
  }
});

app.delete("/api/photos/:id", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return sendResponse(res, 404, false, "Không tìm thấy ảnh để xóa.");
    }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
      } catch (clErr: any) {
        console.warn("Lỗi khi xóa ảnh trên Cloudinary:", clErr.message);
      }
    }

    await prisma.photo.delete({ where: { id } });

    return sendResponse(res, 200, true, "Xóa ảnh thành công!");
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi xóa ảnh: " + error.message);
  }
});

app.get("/api/dashboard", authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const totalPhotos = await prisma.photo.count();

    const sumResult = await prisma.photo.aggregate({
      _sum: {
        bytes: true,
      },
    });
    const totalSize = sumResult._sum.bytes || 0;

    const newestPhoto = await prisma.photo.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let cloudinaryStorageUsed = 0;
    let cloudinaryStorageLimit = 0;
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const usage = await cloudinary.api.usage();
        cloudinaryStorageUsed = usage.storage.usage;
        cloudinaryStorageLimit = usage.storage.limit;
      } catch (cErr: any) {
        console.warn("Không lấy được dung lượng Cloudinary:", cErr.message);
      }
    }

    return sendResponse(res, 200, true, "Lấy thông tin dashboard thành công", {
      totalPhotos,
      totalSize,
      newestPhoto,
      cloudinaryUsage: {
        used: cloudinaryStorageUsed,
        limit: cloudinaryStorageLimit,
      },
    });
  } catch (error: any) {
    return sendResponse(res, 500, false, "Lỗi khi lấy thông tin dashboard: " + error.message);
  }
});



// --- MULTI-PLATFORM BTCH DOWNLOADER ENDPOINTS ---
const downloaderRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Quá nhiều yêu cầu, vui lòng thử lại sau.", statusCode: 429 } },
});

// ==========================================
// MEDIA DOWNLOADER & STREAMING API V1 ROUTES
// ==========================================

// Trang tài liệu API v1
app.get(["/api/v1", "/api/v1/", "/apiv1", "/apiv1/", "/v1", "/v1/"], (req: Request, res: Response) => renderDocHTML(req, res));

// Endpoint phụ trợ
app.get(["/api/platforms", "/api/v1/platforms", "/apiv1/platforms", "/v1/platforms"], listPlatforms);
app.get(["/api/health", "/api/v1/health", "/apiv1/health", "/v1/health"], downloaderHealth);

// Proxy stream & fetch media
app.get(["/api/fetch-media", "/api/v1/fetch-media", "/apiv1/fetch-media", "/v1/fetch-media"], downloaderRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    return await fetchMedia(req, res);
  } catch (error: any) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message, statusCode: error.statusCode }
      });
    }
    next(error);
  }
});

// YouTube Info — trả JSON với direct CDN URLs có thể phát thẳng từ trình duyệt
app.get(["/api/v1/youtube/info", "/apiv1/youtube/info", "/v1/youtube/info"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req.query.url || req.query.id || req.query.v) as string;
    if (!input) return res.status(400).json({ status: false, message: "Thiếu tham số ?url= hoặc ?id=" });
    const info = await getYouTubePlayInfo(req, input);
    return res.json(info);
  } catch (error) { next(error); }
});

// YouTube Player — trang HTML nhúng trình phát ngay trên trình duyệt
app.get(["/api/v1/youtube/player", "/apiv1/youtube/player", "/v1/youtube/player"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req.query.url || req.query.id || req.query.v) as string;
    if (!input) return res.status(400).send("<h2>Thiếu tham số ?url=</h2>");

    const videoId = extractVideoId(input);
    if (!videoId) return res.status(400).send("<h2>Video ID không hợp lệ.</h2>");

    const [meta, urls] = await Promise.all([
      getYouTubeMetadata(videoId),
      getYtDlpDirectUrl(videoId, "both"),
    ]);

    const title = cleanName(meta.title || "YouTube Player");
    const duration = formatDuration(meta.duration);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#0a0e17;color:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 16px}
    .card{width:100%;max-width:800px;background:#111827;border:1px solid #1f2d44;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.7)}
    .thumb{position:relative;width:100%;aspect-ratio:16/9;background:#000}
    .thumb img{width:100%;height:100%;object-fit:cover;opacity:.85}
    .thumb .play-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);cursor:pointer;transition:.2s}
    .thumb .play-over:hover{background:rgba(0,0,0,.1)}
    .thumb .play-over svg{width:72px;height:72px;fill:#fff;drop-shadow:0 0 12px rgba(0,0,0,.8)}
    .info{padding:20px 24px}
    .info h1{font-size:1.15rem;font-weight:700;margin-bottom:6px;line-height:1.4}
    .info p{color:#64748b;font-size:.88rem;margin-bottom:16px}
    .media-section{margin-top:0;padding:0 24px 24px}
    .media-label{font-size:.8rem;font-weight:600;color:#38bdf8;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px}
    audio,video{width:100%;border-radius:8px;background:#000;outline:none;margin-bottom:4px}
    video{max-height:420px}
    .actions{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:.875rem;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:.2s}
    .btn-dl-audio{background:linear-gradient(90deg,#10b981,#059669);color:#fff}
    .btn-dl-video{background:linear-gradient(90deg,#3b82f6,#1d4ed8);color:#fff}
    .btn-yt{background:#1f2937;color:#94a3b8;border:1px solid #334155}
    .btn:hover{transform:translateY(-1px);opacity:.9}
    .no-src{color:#ef4444;font-size:.85rem;padding:10px 0}
  </style>
</head>
<body>
  <div class="card">
    <div class="thumb" id="thumbArea">
      <img src="${meta.thumbnail}" alt="${title}" id="thumbImg">
      <div class="play-over" id="playBtn" onclick="startPlay()">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="rgba(0,0,0,.5)"/><path d="M9.5 7.5v9l7-4.5-7-4.5z"/></svg>
      </div>
    </div>

    <div class="info">
      <h1>${title}</h1>
      <p>🎵 ${meta.author} &nbsp;·&nbsp; ⏱ ${duration}</p>
    </div>

    <div class="media-section">
      ${urls.audioUrl ? `
      <div class="media-label">🎧 Nghe trực tiếp (Audio)</div>
      <audio id="audioPlayer" controls preload="metadata">
        <source src="${urls.audioUrl}" type="audio/mp4">
        Trình duyệt của bạn không hỗ trợ audio.
      </audio>` : ""}

      ${urls.videoUrl ? `
      <div class="media-label" style="margin-top:16px">🎬 Xem trực tiếp (Video)</div>
      <video id="videoPlayer" controls preload="metadata" poster="${meta.thumbnail}">
        <source src="${urls.videoUrl}" type="video/mp4">
        Trình duyệt của bạn không hỗ trợ video.
      </video>` : ""}

      ${!urls.audioUrl && !urls.videoUrl ? `<p class="no-src">⚠️ Không thể lấy đường dẫn phát trực tiếp cho video này. Thử tải về bên dưới.</p>` : ""}

      <div class="actions">
        ${urls.audioUrl ? `<a class="btn btn-dl-audio" href="${urls.audioUrl}" download="${title}.m4a">⬇️ Tải Audio (M4A)</a>` : ""}
        ${urls.videoUrl ? `<a class="btn btn-dl-video" href="${urls.videoUrl}" download="${title}.mp4">⬇️ Tải Video (MP4)</a>` : ""}
        <a class="btn btn-yt" href="https://www.youtube.com/watch?v=${videoId}" target="_blank">▶ Mở YouTube</a>
      </div>
    </div>
  </div>

  <script>
    function startPlay() {
      const audio = document.getElementById('audioPlayer');
      const video = document.getElementById('videoPlayer');
      const btn = document.getElementById('playBtn');
      if (btn) btn.style.display = 'none';
      if (video) { video.scrollIntoView({behavior:'smooth'}); video.play(); }
      else if (audio) { audio.play(); }
    }
  </script>
</body>
</html>`);
  } catch (error) { next(error); }
});

// Direct Stream endpoints
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

app.get(["/api/v1/soundcloud/stream/:filename", "/apiv1/soundcloud/stream/:filename", "/v1/soundcloud/stream/:filename"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const input = filename.replace(/\.mp3$/i, "");
    return await streamSoundCloudMedia(req, res, input);
  } catch (error) {
    next(error);
  }
});

// Endpoint Tải Media Đa Nền Tảng: /api/v1/:platform?url=... (hoặc ?search=...)
app.get(["/api/v1/:platform", "/apiv1/:platform", "/v1/:platform", "/api/download/:platform"], downloaderRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const { platform } = req.params;

  // Xử lý các legacy params cho YouTube nếu có stream/download đặc thù
  if (platform === "youtube") {
    const { stream, download, search, type, format, url } = req.query as any;
    if (stream) {
      const parsed = parseDownloadInput(stream, type, format);
      return await streamYouTubeMedia(req, res, parsed.url, parsed.type);
    }
    if (download) {
      const parsed = parseDownloadInput(download, type, format);
      const info = await getYouTubeDownloadInfo(req, parsed.url, parsed.type);
      return res.status(info.status ? 200 : 400).json(info);
    }
    if (search && !url) {
      const data = await searchYouTube(search as string);
      return res.status(data.status ? 200 : 400).json(data);
    }
  }

  // Xử lý các legacy params cho SoundCloud nếu có stream/download đặc thù
  if (platform === "soundcloud") {
    const { stream, download, search, type, format, url } = req.query as any;
    if (stream) {
      const parsed = parseDownloadInput(stream, type, format);
      return await streamSoundCloudMedia(req, res, parsed.url);
    }
    if (download) {
      const parsed = parseDownloadInput(download, type, format);
      const info = await getSoundCloudDownloadInfo(req, parsed.url, parsed.type);
      return res.status(info.status ? 200 : 400).json(info);
    }
    if (search && !url) {
      const data = await searchSoundCloud(search as string);
      return res.status(data.status ? 200 : 400).json(data);
    }
  }

  // Gọi Trực Tiếp Multi-Platform Downloader
  try {
    return await downloadPlatformMedia(req, res);
  } catch (error: any) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message, statusCode: error.statusCode }
      });
    }
    next(error);
  }
});


// ==========================================
// FME-CTUT DRIVE GALLERY API
// ==========================================

const FME_IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".ico", ".avif", ".heic", ".tiff"
]);

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFmeCtutDirs(): string[] {
  const dirs = [
    path.join(process.cwd(), "public", "fme-ctut"),
    path.join(process.cwd(), "dist", "fme-ctut"),
  ];
  return dirs.filter((d) => fs.existsSync(d));
}

// ==========================================
// GOOGLE DRIVE SYSTEM API (MULTI-FOLDER, PASSWORD & SHARE)
// ==========================================

const DRIVE_IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".ico", ".avif", ".heic", ".tiff"
]);

const GITHUB_OWNER = process.env.GITHUB_OWNER || "Kzi207";
const GITHUB_REPO = process.env.GITHUB_REPO || "kziprofile";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "master";

interface DriveFolderMeta {
  id: string;
  name: string;
  description?: string;
  hasPassword: boolean;
  passwordHash?: string;
  allowEdit: boolean;
  allowDownload: boolean;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_DRIVE_FOLDERS: DriveFolderMeta[] = [
  {
    id: "fme-ctut",
    name: "FME - CTUT",
    description: "Thư mục hình ảnh Khoa Cơ khí CTUT",
    hasPassword: false,
    allowEdit: true,
    allowDownload: true,
    shareToken: "fme-ctut-default-share",
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  }
];

function getEffectiveGithubToken(req: Request): string | null {
  const headerToken = req.headers["x-github-token"] as string;
  if (headerToken && headerToken.trim()) return headerToken.trim();
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken && envToken.trim()) return envToken.trim();
  return null;
}

function slugifyFolderName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "folder-" + Date.now();
}

async function getStoredFolders(): Promise<DriveFolderMeta[]> {
  // Primary: Read from local folders.json
  const localFile = path.join(process.cwd(), "public", "drive", "folders.json");
  if (fs.existsSync(localFile)) {
    try {
      const content = fs.readFileSync(localFile, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }

  try {
    const row = await prisma.setting.findUnique({ where: { key: "drive_folders" } });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("DB read folders error:", e);
  }

  return DEFAULT_DRIVE_FOLDERS;
}

async function saveStoredFolders(folders: DriveFolderMeta[]): Promise<void> {
  const jsonStr = JSON.stringify(folders, null, 2);
  try {
    await prisma.setting.upsert({
      where: { key: "drive_folders" },
      update: { value: jsonStr, updatedAt: new Date() },
      create: { key: "drive_folders", value: jsonStr, description: "Drive Folders Metadata" },
    });
  } catch (e) {
    console.warn("DB save folders error:", e);
  }

  try {
    const dir = path.join(process.cwd(), "public", "drive");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "folders.json"), jsonStr);
    const distDir = path.join(process.cwd(), "dist", "drive");
    if (fs.existsSync(distDir)) fs.writeFileSync(path.join(distDir, "folders.json"), jsonStr);
  } catch (e) {}
}

async function resolveFolderDirs(folderKey: string): Promise<{ folderName: string; localDirs: string[] }> {
  const folders = await getStoredFolders();
  const matched: any = folders.find(
    (f: any) => String(f.id) === String(folderKey) || f.folder === folderKey || f.name === folderKey
  );
  const rawName = matched ? (matched.folder || matched.name || matched.id) : folderKey;
  const slugName = slugifyFolderName(rawName);

  const localDirs: string[] = [];
  const candidates = [
    path.join(process.cwd(), "public", "drive", rawName),
    path.join(process.cwd(), "public", rawName),
    path.join(process.cwd(), "public", "drive", slugName),
    path.join(process.cwd(), "public", slugName),
    path.join(process.cwd(), "dist", "drive", rawName),
    path.join(process.cwd(), "dist", rawName),
    path.join(process.cwd(), "dist", "drive", slugName),
    path.join(process.cwd(), "dist", slugName),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && !localDirs.includes(c)) {
      localDirs.push(c);
    }
  }

  return { folderName: rawName, localDirs };
}

function resolveFolderPaths(folderId: string): { githubPath: string; localDirs: string[] } {
  const safeId = path.basename(folderId);
  return {
    githubPath: `public/drive/${safeId}`,
    localDirs: [
      path.join(process.cwd(), "public", "drive", safeId),
      path.join(process.cwd(), "public", safeId),
      path.join(process.cwd(), "dist", "drive", safeId),
      path.join(process.cwd(), "dist", safeId),
    ],
  };
}

// 0. GitHub Status
app.get("/api/drive/github-status", (req: Request, res: Response) => {
  const token = getEffectiveGithubToken(req);
  return res.json({
    success: true,
    hasToken: !!token,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
  });
});

// 1. Get All Folders
app.get("/api/drive/folders", async (req: Request, res: Response) => {
  try {
    const folders = await getStoredFolders();
    const shareKey = (req.query.share as string)?.trim();

    let safeFolders = await Promise.all(
      folders.map(async (f: any) => {
        const folderName = f.folder || f.name || f.id;
        const { localDirs } = await resolveFolderDirs(f.id || folderName);

        // Auto count images in the directory
        let count = 0;
        const countedFiles = new Set<string>();
        for (const d of localDirs) {
          if (fs.existsSync(d)) {
            try {
              const items = fs.readdirSync(d);
              for (const item of items) {
                if (item.startsWith(".") || item.toLowerCase() === "index.html" || item.toLowerCase() === "manifest.json" || item.toLowerCase() === "folders.json") continue;
                const ext = path.extname(item).toLowerCase();
                if (DRIVE_IMAGE_EXTS.has(ext) && !countedFiles.has(item)) {
                  countedFiles.add(item);
                  count++;
                }
              }
            } catch (e) {}
          }
        }

        return {
          id: String(f.id),
          folder: folderName,
          name: folderName,
          description: f.description || "",
          filesCount: count,
          shareId: String(f.id),
          hasPassword: !!f.passwordHash,
          allowEdit: f.allowEdit !== false,
          allowDownload: f.allowDownload !== false,
          createdAt: f.createdAt || new Date().toISOString(),
          updatedAt: f.updatedAt || new Date().toISOString(),
        };
      })
    );

    // If a specific share target was requested, only return that folder!
    if (shareKey) {
      safeFolders = safeFolders.filter(
        (f) => String(f.id) === String(shareKey) || f.folder === shareKey || f.name === shareKey
      );
    }

    return res.json({
      success: true,
      count: safeFolders.length,
      data: safeFolders,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách thư mục:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Create New Folder
app.post("/api/drive/folders", async (req: Request, res: Response) => {
  try {
    const { name, password, description, allowEdit, allowDownload } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên thư mục" });
    }

    const trimmedName = name.trim();
    let folderId = slugifyFolderName(trimmedName);

    const folders = await getStoredFolders();
    // Ensure unique ID
    let count = 1;
    const baseId = folderId;
    while (folders.some((f) => f.id === folderId)) {
      folderId = `${baseId}-${count++}`;
    }

    const passwordHash = password && password.trim() ? bcryptjs.hashSync(password.trim(), 10) : undefined;
    const shareToken = "share_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const newFolder: DriveFolderMeta = {
      id: folderId,
      name: trimmedName,
      description: description?.trim() || "",
      hasPassword: !!passwordHash,
      passwordHash,
      allowEdit: allowEdit !== false,
      allowDownload: allowDownload !== false,
      shareToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    folders.push(newFolder);
    await saveStoredFolders(folders);

    // Create local directory
    const { localDirs, githubPath } = resolveFolderPaths(folderId);
    try {
      if (!fs.existsSync(localDirs[0])) {
        fs.mkdirSync(localDirs[0], { recursive: true });
      }
    } catch (e) {}

    // Commit .gitkeep to GitHub if token available
    const token = getEffectiveGithubToken(req);
    let githubCreated = false;
    if (token) {
      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}/.gitkeep`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "Drive-App",
            },
            body: JSON.stringify({
              message: `Create folder ${trimmedName} via Drive`,
              content: Buffer.from("").toString("base64"),
              branch: GITHUB_BRANCH,
            }),
          }
        );
        if (ghRes.ok) githubCreated = true;
      } catch (ghErr) {
        console.warn("GitHub folder create warning:", ghErr);
      }
    }

    return res.json({
      success: true,
      message: `Đã tạo thư mục "${trimmedName}" thành công!`,
      data: {
        id: newFolder.id,
        name: newFolder.name,
        description: newFolder.description,
        hasPassword: !!newFolder.passwordHash,
        allowEdit: newFolder.allowEdit,
        allowDownload: newFolder.allowDownload,
        shareToken: newFolder.shareToken,
        createdAt: newFolder.createdAt,
      },
      githubCreated,
    });
  } catch (error: any) {
    console.error("Lỗi tạo thư mục:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Unlock Password-Protected Folder
app.post("/api/drive/folders/unlock", async (req: Request, res: Response) => {
  try {
    const { folderId, password } = req.body;
    if (!folderId || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập mật khẩu" });
    }

    const folders = await getStoredFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thư mục" });
    }

    if (!folder.passwordHash) {
      return res.json({ success: true, unlocked: true });
    }

    const isValid = bcryptjs.compareSync(password, folder.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Mật khẩu không chính xác!" });
    }

    return res.json({
      success: true,
      unlocked: true,
      message: "Mở khóa thư mục thành công!",
      folder: {
        id: folder.id,
        name: folder.name,
        allowEdit: folder.allowEdit,
        allowDownload: folder.allowDownload,
      },
    });
  } catch (error: any) {
    console.error("Lỗi mở khóa thư mục:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Update Folder (Name, Password, Permissions)
app.put("/api/drive/folders/:id", async (req: Request, res: Response) => {
  try {
    const folderId = req.params.id;
    const { name, password, removePassword, description, allowEdit, allowDownload } = req.body;

    const folders = await getStoredFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thư mục" });
    }

    if (name && typeof name === "string" && name.trim()) {
      folder.name = name.trim();
    }
    if (description !== undefined) {
      folder.description = String(description).trim();
    }
    if (allowEdit !== undefined) {
      folder.allowEdit = !!allowEdit;
    }
    if (allowDownload !== undefined) {
      folder.allowDownload = !!allowDownload;
    }

    if (removePassword) {
      folder.passwordHash = undefined;
      folder.hasPassword = false;
    } else if (password && password.trim()) {
      folder.passwordHash = bcryptjs.hashSync(password.trim(), 10);
      folder.hasPassword = true;
    }

    folder.updatedAt = new Date().toISOString();
    await saveStoredFolders(folders);

    return res.json({
      success: true,
      message: "Cập nhật thông tin thư mục thành công!",
      data: {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        hasPassword: !!folder.passwordHash,
        allowEdit: folder.allowEdit,
        allowDownload: folder.allowDownload,
        shareToken: folder.shareToken,
      },
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật thư mục:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Delete Folder
app.delete("/api/drive/folders/:id", async (req: Request, res: Response) => {
  try {
    const folderId = req.params.id;
    if (folderId === "fme-ctut") {
      return res.status(400).json({ success: false, message: "Không thể xóa thư mục gốc FME - CTUT" });
    }

    let folders = await getStoredFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thư mục" });
    }

    folders = folders.filter((f) => f.id !== folderId);
    await saveStoredFolders(folders);

    // Delete local directory
    const { localDirs } = resolveFolderPaths(folderId);
    for (const d of localDirs) {
      if (fs.existsSync(d)) {
        try {
          fs.rmSync(d, { recursive: true, force: true });
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      message: `Đã xóa thư mục "${folder.name}" thành công!`,
    });
  } catch (error: any) {
    console.error("Lỗi xóa thư mục:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Get Files in a Folder
app.get("/api/drive/files", async (req: Request, res: Response) => {
  try {
    const folderKey = (req.query.folder as string) || "1";
    const { folderName, localDirs } = await resolveFolderDirs(folderKey);

    const fileMap = new Map<string, any>();
    let totalBytes = 0;

    for (const dir of localDirs) {
      if (fs.existsSync(dir)) {
        try {
          const localFiles = fs.readdirSync(dir);
          for (const file of localFiles) {
            if (
              file === ".gitkeep" ||
              file.toLowerCase() === "index.html" ||
              file.toLowerCase() === "manifest.json" ||
              file.toLowerCase() === "folders.json" ||
              file.startsWith(".")
            ) {
              continue;
            }
            const ext = path.extname(file).toLowerCase();
            if (!DRIVE_IMAGE_EXTS.has(ext)) continue;

            if (!fileMap.has(file)) {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat.isFile()) {
                totalBytes += stat.size;
                const relFromPublic = path.relative(path.join(process.cwd(), "public"), filePath).replace(/\\/g, "/");
                const url = (relFromPublic && !relFromPublic.startsWith(".."))
                  ? `/${relFromPublic}`
                  : `/api/drive/download?folder=${encodeURIComponent(folderKey)}&file=${encodeURIComponent(file)}`;

                fileMap.set(file, {
                  name: file,
                  size: stat.size,
                  sizeFormatted: formatBytes(stat.size),
                  mtime: stat.mtime.toISOString(),
                  ext: ext.replace(".", "").toUpperCase(),
                  url: url,
                  downloadUrl: `/api/drive/download?folder=${encodeURIComponent(folderKey)}&file=${encodeURIComponent(file)}`,
                  isGithub: false,
                });
              }
            }
          }
        } catch (e) {}
      }
    }

    let images = Array.from(fileMap.values());
    const requestedFile = (req.query.file as string)?.trim();
    if (requestedFile) {
      images = images.filter(
        (img) =>
          img.name.toLowerCase() === requestedFile.toLowerCase() ||
          encodeURIComponent(img.name).toLowerCase() === requestedFile.toLowerCase()
      );
      // Recalculate totalBytes for the requested file
      totalBytes = images.reduce((acc, cur) => acc + (cur.size || 0), 0);
    }

    images.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    return res.json({
      success: true,
      folderId: folderKey,
      folderName,
      count: images.length,
      totalBytes,
      totalSizeFormatted: formatBytes(totalBytes),
      data: images,
    });
  } catch (error: any) {
    console.error("Lỗi lấy tệp:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Download File
app.get("/api/drive/download", async (req: Request, res: Response) => {
  try {
    const filename = req.query.file as string;
    const folderKey = (req.query.folder as string) || "1";
    if (!filename || typeof filename !== "string") {
      return res.status(400).send("Thiếu tham số file");
    }

    const safeName = path.basename(filename);
    const { localDirs } = await resolveFolderDirs(folderKey);

    for (const dir of localDirs) {
      const targetPath = path.join(dir, safeName);
      if (fs.existsSync(targetPath)) {
        return res.download(targetPath, safeName);
      }
    }

    // Direct check public and dist
    const directPaths = [
      path.join(process.cwd(), "public", "fme-ctut", safeName),
      path.join(process.cwd(), "public", "drive", safeName),
      path.join(process.cwd(), "dist", "fme-ctut", safeName),
      path.join(process.cwd(), "dist", "drive", safeName),
    ];
    for (const p of directPaths) {
      if (fs.existsSync(p)) {
        return res.download(p, safeName);
      }
    }

    return res.status(404).send("Không tìm thấy tệp ảnh");
  } catch (error: any) {
    console.error("Lỗi tải tệp:", error);
    return res.status(500).send("Lỗi tải tệp: " + error.message);
  }
});

// 8. Upload File to Folder
app.post("/api/drive/upload", async (req: Request, res: Response) => {
  try {
    const { folder, filename, base64 } = req.body;
    const folderId = folder || "fme-ctut";
    if (!filename || !base64) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu tệp hoặc tên tệp" });
    }

    const safeName = path.basename(filename);
    const ext = path.extname(safeName).toLowerCase();
    if (!DRIVE_IMAGE_EXTS.has(ext)) {
      return res.status(400).json({ success: false, message: "Định dạng tệp không được hỗ trợ" });
    }

    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    const token = getEffectiveGithubToken(req);
    const { githubPath, localDirs } = resolveFolderPaths(folderId);

    let githubCommitted = false;
    let githubCommitUrl = "";

    // Commit to GitHub if token available
    if (token) {
      let sha: string | undefined = undefined;
      try {
        const checkRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}/${encodeURIComponent(safeName)}?ref=${GITHUB_BRANCH}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Drive-App",
            },
          }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          sha = existing.sha;
        }
      } catch (e) {}

      const ghPutRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}/${encodeURIComponent(safeName)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Drive-App",
          },
          body: JSON.stringify({
            message: `Upload ${safeName} to ${folderId} via Drive`,
            content: cleanBase64,
            branch: GITHUB_BRANCH,
            ...(sha ? { sha } : {}),
          }),
        }
      );

      if (ghPutRes.ok) {
        const ghData = await ghPutRes.json();
        githubCommitted = true;
        githubCommitUrl = ghData.commit?.html_url || "";
      } else {
        const errJson = await ghPutRes.json().catch(() => ({}));
        return res.status(ghPutRes.status).json({
          success: false,
          message: "Lỗi GitHub: " + (errJson.message || "Không thể commit lên repo"),
        });
      }
    }

    // Write locally
    const buffer = Buffer.from(cleanBase64, "base64");
    try {
      for (const d of localDirs) {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, safeName), buffer);
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: githubCommitted
        ? `Đã commit thành công lên GitHub (${GITHUB_OWNER}/${GITHUB_REPO})!`
        : "Đã tải lên máy chủ thành công.",
      githubCommitted,
      githubCommitUrl,
      file: {
        name: safeName,
        size: buffer.length,
        sizeFormatted: formatBytes(buffer.length),
        ext: ext.replace(".", "").toUpperCase(),
        url: `/${githubPath.replace(/^public\//, "")}/${encodeURIComponent(safeName)}`,
        downloadUrl: `/api/drive/download?folder=${encodeURIComponent(folderId)}&file=${encodeURIComponent(safeName)}`,
      },
    });
  } catch (error: any) {
    console.error("Lỗi upload tệp:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Delete File from Folder
app.delete("/api/drive/delete", async (req: Request, res: Response) => {
  try {
    const filename = (req.body?.filename || req.query?.file) as string;
    const folderId = (req.body?.folder || req.query?.folder || "fme-ctut") as string;
    const providedSha = req.body?.sha as string | undefined;

    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ success: false, message: "Thiếu tên tệp cần xóa" });
    }

    const safeName = path.basename(filename);
    const token = getEffectiveGithubToken(req);
    const { githubPath, localDirs } = resolveFolderPaths(folderId);

    let githubDeleted = false;

    if (token) {
      let sha = providedSha;
      if (!sha) {
        const checkRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}/${encodeURIComponent(safeName)}?ref=${GITHUB_BRANCH}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Drive-App",
            },
          }
        );
        if (checkRes.ok) {
          const item = await checkRes.json();
          sha = item.sha;
        }
      }

      if (sha) {
        const ghDelRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${githubPath}/${encodeURIComponent(safeName)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "Drive-App",
            },
            body: JSON.stringify({
              message: `Delete ${safeName} from ${folderId} via Drive`,
              sha,
              branch: GITHUB_BRANCH,
            }),
          }
        );

        if (ghDelRes.ok) {
          githubDeleted = true;
        }
      }
    }

    for (const d of localDirs) {
      const p = path.join(d, safeName);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      message: githubDeleted ? `Đã tạo commit xóa tệp ${safeName} trên GitHub!` : `Đã xóa tệp ${safeName}.`,
      githubDeleted,
    });
  } catch (error: any) {
    console.error("Lỗi xóa tệp:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compatibility alias for /api/fme-ctut
app.get("/api/fme-ctut", (req: Request, res: Response) => {
  req.url = "/api/drive/files?folder=fme-ctut";
  app._router.handle(req, res);
});
app.get("/api/fme-ctut/download", (req: Request, res: Response) => {
  req.url = `/api/drive/download?folder=fme-ctut&file=${encodeURIComponent((req.query.file as string) || "")}`;
  app._router.handle(req, res);
});
app.post("/api/fme-ctut/upload", (req: Request, res: Response) => {
  req.body.folder = "fme-ctut";
  req.url = "/api/drive/upload";
  app._router.handle(req, res);
});
app.delete("/api/fme-ctut/delete", (req: Request, res: Response) => {
  req.body.folder = "fme-ctut";
  req.url = "/api/drive/delete";
  app._router.handle(req, res);
});

// Static routing for /drive, /fme-ctut, and assets
app.use("/drive", express.static(path.join(process.cwd(), "public", "drive")));
app.use("/fme-ctut", express.static(path.join(process.cwd(), "public", "fme-ctut")));

// Direct HTML handlers for /drive and /fme-ctut (no index.html required in URL)
app.get(["/drive", "/drive/*"], (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes(".") && !req.path.endsWith(".html")) {
    return next();
  }
  const driveHtml = path.join(process.cwd(), "public", "drive", "index.html");
  if (fs.existsSync(driveHtml)) {
    return res.sendFile(driveHtml);
  }
  const distDriveHtml = path.join(process.cwd(), "dist", "drive", "index.html");
  if (fs.existsSync(distDriveHtml)) {
    return res.sendFile(distDriveHtml);
  }
  next();
});

app.get(["/fme-ctut", "/fme-ctut/*"], (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes(".") && !req.path.endsWith(".html")) {
    return next();
  }
  const fmeHtml = path.join(process.cwd(), "public", "fme-ctut", "index.html");
  if (fs.existsSync(fmeHtml)) {
    return res.sendFile(fmeHtml);
  }
  next();
});

// ==========================================
// VITE OR STATIC FILE SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use((req, res, next) => {
      if (
        req.path === "/drive" ||
        req.path.startsWith("/drive/") ||
        req.path.startsWith("/api") ||
        req.path === "/fme-ctut" ||
        req.path.startsWith("/fme-ctut/")
      ) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
    console.log("🚀 Running in Development mode with Vite middleware.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("🌐 Running in Production mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`📡 Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("❌ Failed to start the server:", err);
  });
}

export default app;
