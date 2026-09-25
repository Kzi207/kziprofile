import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const neonUrl = process.env.DATABASE_URL;
if (!neonUrl) {
  console.error("❌ Không tìm thấy DATABASE_URL trong .env");
  process.exit(1);
}

console.log("🔗 Đang kết nối tới Neon Database trong .env:", neonUrl.replace(/:[^:@]+@/, ":****@"));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: neonUrl,
    },
  },
});

async function main() {
  console.log("🚀 Bắt đầu đồng bộ toàn bộ dữ liệu vào Neon Database...");

  // 1. ADMIN USER
  const hashedPassword = bcryptjs.hashSync("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      name: "Lê Khánh Duy",
      nickname: "Kzi",
      email: "toi05022020@gmail.com",
      avatar: "/me.jpg",
      birthday: "2007-11-22",
      address: "Cần Thơ, Việt Nam",
      bio: "Sinh viên ngành Công nghệ Kỹ thuật Cơ điện tử (CTUT). Yêu thích lập trình Web Full-stack, AI, Cloud và phát triển hệ thống.",
      socialGithub: "https://github.com/kzi207",
      socialLinkedin: "https://www.facebook.com/kzi207",
      socialTwitter: "https://www.tiktok.com/@kzi207",
    },
    create: {
      username: "admin",
      password: hashedPassword,
      name: "Lê Khánh Duy",
      nickname: "Kzi",
      email: "toi05022020@gmail.com",
      avatar: "/me.jpg",
      birthday: "2007-11-22",
      address: "Cần Thơ, Việt Nam",
      bio: "Sinh viên ngành Công nghệ Kỹ thuật Cơ điện tử (CTUT). Yêu thích lập trình Web Full-stack, AI, Cloud và phát triển hệ thống.",
      socialGithub: "https://github.com/kzi207",
      socialLinkedin: "https://www.facebook.com/kzi207",
      socialTwitter: "https://www.tiktok.com/@kzi207",
    },
  });
  console.log(`✅ Admin user đã lưu vào Neon: ${admin.username} (${admin.name})`);

  // 2. DRIVE FOLDERS METADATA
  const driveFoldersPath = path.join(process.cwd(), "data", "drive_folders.json");
  let driveFoldersContent = "[]";
  if (fs.existsSync(driveFoldersPath)) {
    driveFoldersContent = fs.readFileSync(driveFoldersPath, "utf-8");
  }
  await prisma.setting.upsert({
    where: { key: "drive_folders" },
    update: { value: driveFoldersContent, updatedAt: new Date() },
    create: {
      key: "drive_folders",
      value: driveFoldersContent,
      description: "Danh sách thư mục Drive Metadata (Đồng bộ Neon)",
    },
  });
  console.log("✅ drive_folders đã lưu vào Neon:", JSON.parse(driveFoldersContent).length, "thư mục");

  // 3. DRIVE FILES DUAL STORAGE (LOCAL + CATBOX)
  const driveFilesPath = path.join(process.cwd(), "data", "drive_files.json");
  let driveFilesContent = "[]";
  if (fs.existsSync(driveFilesPath)) {
    driveFilesContent = fs.readFileSync(driveFilesPath, "utf-8");
  }
  await prisma.setting.upsert({
    where: { key: "drive_files_db" },
    update: { value: driveFilesContent, updatedAt: new Date() },
    create: {
      key: "drive_files_db",
      value: driveFilesContent,
      description: "Danh sách tệp tin Drive Dual Storage (Local + Catbox.moe)",
    },
  });
  console.log("✅ drive_files_db đã lưu vào Neon:", JSON.parse(driveFilesContent).length, "tệp");

  // 4. SITE SETTINGS
  const defaultSettings = [
    { key: "site_title", value: "Kzi // Anime Cyberpunk Drive & Portfolio", description: "Tiêu đề trang web" },
    { key: "site_description", value: "Portfolio & Hệ thống Lưu trữ Drive Dual-Backup của Lê Khánh Duy (Kzi)", description: "Mô tả SEO trang web" },
    { key: "hero_title", value: "Lê Khánh Duy", description: "Tên hiển thị phần Hero" },
    { key: "hero_subtitle", value: "Xin chào bồ tèo!", description: "Vị trí phần Hero" },
    { key: "status_active", value: "DEVELOPING & HOSTING", description: "Trạng thái làm việc" },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("✅ Cài đặt hệ thống (site settings) đã lưu vào Neon.");

  // 5. SKILLS
  const skillsData = [
    { name: "React / Vite / Next.js", category: "Frontend", level: 85, iconName: "Atom" },
    { name: "Node.js / Express", category: "Backend", level: 88, iconName: "Server" },
    { name: "PostgreSQL / Prisma / Neon", category: "Database", level: 86, iconName: "Database" },
    { name: "Git & GitHub Dual Cloud", category: "Tools", level: 88, iconName: "Github" },
    { name: "AI & Bot Messenger", category: "AI", level: 82, iconName: "Bot" },
  ];
  for (const skill of skillsData) {
    const existing = await prisma.skill.findFirst({ where: { name: skill.name } });
    if (!existing) {
      await prisma.skill.create({ data: skill });
    }
  }
  console.log("✅ Kỹ năng (skills) đã lưu vào Neon.");

  // 6. PROJECTS
  const projectsData = [
    {
      title: "Anime Cyberpunk Drive & Portfolio",
      description: "Hệ thống Drive lưu trữ đa phương tiện phong cách Cyberpunk, tích hợp Dual-Storage (Local Drive + Catbox.moe Backup), quản trị PostgreSQL Neon và phân quyền bảo mật riêng tư.",
      thumbnail: "/me.jpg",
      gallery: ["/me.jpg"],
      githubUrl: "https://github.com/kzi207",
      demoUrl: "http://localhost:3000/drive",
      techStack: ["React", "TypeScript", "TailwindCSS", "Prisma", "PostgreSQL Neon", "Catbox.moe API"],
      category: "Fullstack",
    },
    {
      title: "Facebook Messenger Bot AI",
      description: "Bot Messenger hỗ trợ quản lý nhóm, trò chuyện AI, phát nhạc, lưu lịch sử hội thoại và tích hợp Gemini.",
      thumbnail: "https://files.catbox.moe/zqm8nt.jpg",
      gallery: ["https://files.catbox.moe/zqm8nt.jpg"],
      githubUrl: "https://github.com/kzi207",
      demoUrl: "",
      techStack: ["Node.js", "Express", "Gemini API", "MongoDB"],
      category: "AI",
    },
    {
      title: "Hệ thống Quản lý Kỹ thuật CTUT",
      description: "Website quản lý tài liệu, đồ án cơ điện tử và phân quyền dữ liệu số trên nền tảng đám mây.",
      thumbnail: "https://files.catbox.moe/bsksv5.png",
      gallery: ["https://files.catbox.moe/bsksv5.png"],
      githubUrl: "https://github.com/kzi207/qlsv",
      demoUrl: "",
      techStack: ["React", "Node.js", "Prisma", "PostgreSQL Neon"],
      category: "Website",
    },
  ];
  for (const proj of projectsData) {
    const existing = await prisma.project.findFirst({ where: { title: proj.title } });
    if (!existing) {
      await prisma.project.create({ data: proj });
    }
  }
  console.log("✅ Dự án (projects) đã lưu vào Neon.");

  // 7. ROADMAP & EXPERIENCE
  const roadmapsData = [
    {
      title: "Bắt đầu học lập trình",
      description: "Làm quen với HTML, CSS, JavaScript và xây dựng các website đầu tiên.",
      status: "Completed",
      order: 1,
      date: "2022 - 2023",
    },
    {
      title: "Tự học Full-stack Development",
      description: "Phát triển kỹ năng với React, Node.js, Express, PostgreSQL và GitHub.",
      status: "Completed",
      order: 2,
      date: "2023 - 2024",
    },
    {
      title: "Sinh viên Cơ điện tử CTUT",
      description: "Theo học ngành Công nghệ Kỹ thuật Cơ điện tử, kết hợp lập trình phần mềm & IoT.",
      status: "Learning",
      order: 3,
      date: "2025 - Nay",
    },
    {
      title: "Full-stack & AI Cloud Engineer",
      description: "Xây dựng các hệ thống quy mô lớn, ứng dụng AI thông minh và hạ tầng đám mây cao cấp.",
      status: "Future",
      order: 4,
      date: "Tương lai",
    },
  ];
  for (const rm of roadmapsData) {
    const existing = await prisma.roadmap.findFirst({ where: { title: rm.title } });
    if (!existing) {
      await prisma.roadmap.create({ data: rm });
    }
  }

  // 8. TỔNG KẾT
  const [userCount, settingsCount, skillsCount, projectsCount, roadmapsCount] = await Promise.all([
    prisma.user.count(),
    prisma.setting.count(),
    prisma.skill.count(),
    prisma.project.count(),
    prisma.roadmap.count(),
  ]);

  console.log("\n=================================================");
  console.log("🎉 ĐÃ LƯU TOÀN BỘ CƠ SỞ DỮ LIỆU VÀO NEON THÀNH CÔNG!");
  console.log(`- Người dùng (Users): ${userCount}`);
  console.log(`- Cài đặt & Drive Metadata (Settings): ${settingsCount}`);
  console.log(`- Kỹ năng (Skills): ${skillsCount}`);
  console.log(`- Dự án (Projects): ${projectsCount}`);
  console.log(`- Lộ trình (Roadmaps): ${roadmapsCount}`);
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi lưu vào Neon:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
