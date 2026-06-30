import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Peua73jJWTUy@ep-red-mountain-at5zo714-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    },
  },
});

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data
  await prisma.message.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.experience.deleteMany({});
  await prisma.roadmap.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🧹 Cleared old database tables.");

  // Create initial admin user
  const hashedPassword = bcryptjs.hashSync("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: hashedPassword,
      name: "Lê Khánh Duy",
      nickname: "Kzi",
      email: "toi05022020@gmail.com",
      avatar: "https://files.catbox.moe/5f5zq9.jpg",
      birthday: "2007-11-22",
      address: "Cần Thơ, Việt Nam",
      bio: "Sinh viên năm nhất ngành Công nghệ Kỹ thuật Cơ điện tử. Yêu thích lập trình Web Full-stack, AI, phát triển Bot Messenger và xây dựng các ứng dụng hiện đại.",
      socialGithub: "https://github.com/kzi207",
      socialLinkedin: "https://www.facebook.com/kzi207",
      socialTwitter: "https://www.tiktok.com/@kzi207",
    },
  });
  console.log(`👤 Created admin user: ${admin.username}`);

  // Create initial settings
  const settingsData = [
    { key: "site_title", value: "Kzi // Portfolio", description: "Tiêu đề trang web" },
    { key: "site_description", value: "Portfolio cá nhân phong cách Anime Cyberpunk của Lê Khánh Duy (Kzi)", description: "Mô tả SEO trang web" },
    { key: "hero_title", value: "Lê Khánh Duy", description: "Tên hiển thị phần Hero" },
    { key: "hero_subtitle", value: "Xin chào bồ tèo!", description: "Vị trí phần Hero" },
    { key: "status_active", value: "LEARNING & DEVELOPING", description: "Trạng thái làm việc" },
  ];

  for (const setting of settingsData) {
    await prisma.setting.create({ data: setting });
  }
  console.log("⚙️  Created default site settings.");

  // Create initial skills
  const skillsData = [
    { name: "React", category: "Frontend", level: 78, iconName: "Atom" },
    { name: "Node.js", category: "Backend", level: 82, iconName: "Server" },
    { name: "Git & GitHub", category: "Tools", level: 85, iconName: "Github" },
    { name: "Gemini API", category: "AI", level: 80, iconName: "Bot" },
  ];

  for (const skill of skillsData) {
    await prisma.skill.create({ data: skill });
  }
  console.log(`⚡ Created ${skillsData.length} technical skills.`);

  // Create Roadmaps
  const roadmapsData = [
    {
      title: "Bắt đầu học lập trình",
      description: "Trong thời gian học THPT, bắt đầu tìm hiểu lập trình, làm quen với HTML, CSS, JavaScript và xây dựng những website đầu tiên.",
      status: "Completed",
      order: 1,
      date: "2022 - 2023",
    },
    {
      title: "Tự học Full-stack Development",
      description: "Tìm hiểu React, Next.js, Node.js, Express, MongoDB và GitHub thông qua các dự án cá nhân.",
      status: "Completed",
      order: 2,
      date: "2023 - 2024",
    },
    {
      title: "Sinh viên năm nhất",
      description: "Theo học ngành Công nghệ Kỹ thuật Cơ điện tử, đồng thời tiếp tục phát triển kỹ năng lập trình Web Full-stack và xây dựng các dự án thực tế.",
      status: "Learning",
      order: 3,
      date: "2025 - Nay",
    },
    {
      title: "AI & Cloud",
      description: "Nghiên cứu Gemini API, OpenAI API, PostgreSQL, Prisma, Cloudflare, Supabase và phát triển các ứng dụng AI.",
      status: "Learning",
      order: 4,
      date: "2026",
    },
    {
      title: "Software Engineer",
      description: "Mục tiêu trở thành Full-stack Software Engineer, xây dựng các hệ thống lớn, ứng dụng AI và dịch vụ Cloud.",
      status: "Future",
      order: 5,
      date: "Tương lai",
    },
  ];

  for (const roadmap of roadmapsData) {
    await prisma.roadmap.create({ data: roadmap });
  }
  console.log(`🗺️ Created ${roadmapsData.length} roadmap items.`);

  // Create Experiences
  const experiencesData = [
    {
      company: "Dự án cá nhân",
      position: "Full-stack Developer",
      description: "Phát triển nhiều website, dashboard quản trị, chatbot AI và bot Facebook Messenger bằng Node.js, Next.js, Prisma và PostgreSQL.",
      startDate: "2024-01",
      endDate: "Present",
      current: true,
    },
    {
      company: "Sinh viên - Đại học Kỹ thuật Công nghệ Cần Thơ",
      position: "Năm nhất",
      description: "Học các môn nền tảng cho ngành Cơ điện tử kèm tự học lập trình.",
      startDate: "2025-09",
      endDate: "Present",
      current: true,
    },
  ];

  for (const exp of experiencesData) {
    await prisma.experience.create({ data: exp });
  }
  console.log(`💼 Created ${experiencesData.length} work experiences.`);

  // Create Certificates
  const certificatesData: any[] = [];

  for (const cert of certificatesData) {
    await prisma.certificate.create({ data: cert });
  }
  console.log(`📜 Created ${certificatesData.length} professional certificates.`);

  // Create Projects
  const projectsData = [
    {
      title: "Portfolio Anime",
      description: "Website portfolio cá nhân phong cách Anime, tích hợp Dashboard quản trị, PostgreSQL, Prisma và hiệu ứng hiện đại.",
      thumbnail: "/projects/portfolio.png",
      gallery: ["/projects/portfolio.png"],
      githubUrl: "https://github.com/kzi207",
      demoUrl: "",
      techStack: ["Next.js", "TypeScript", "TailwindCSS", "Prisma", "PostgreSQL"],
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
      title: "Hệ thống quản lý sinh viên",
      description: "Website quản lý sinh viên với đăng nhập, CRUD, phân quyền và PostgreSQL.",
      thumbnail: "https://files.catbox.moe/bsksv5.png",
      gallery: ["https://files.catbox.moe/bsksv5.png"],
      githubUrl: "https://github.com/kzi207/qlsv",
      demoUrl: "",
      techStack: ["React", "Node.js", "Prisma", "PostgreSQL"],
      category: "Website",
    },
  ];

  for (const proj of projectsData) {
    await prisma.project.create({ data: proj });
  }
  console.log(`🚀 Created ${projectsData.length} master showcase projects.`);

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
