import React, { useState } from "react";
import { Code2, Server, Database, Cloud, Bot, Shield, Wrench, Palette, Sparkles, FileCode, Atom, Globe, Paintbrush } from "lucide-react";
import { Skill } from "../types";

interface SkillsProps {
  skills: Skill[];
}

type CategoryType = "All" | "Frontend" | "Backend" | "Database" | "Cloud" | "AI" | "Tools";

const getCheekyReview = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("html5") || n.includes("html")) return "Xây dựng cấu trúc trang web vững chắc, chuẩn SEO và tối ưu hóa trải nghiệm người dùng.";
  if (n.includes("css3") || n.includes("css")) return "Tạo kiểu giao diện mượt mà, responsive tốt trên mọi thiết bị di động và máy tính.";
  if (n.includes("javascript") || n.includes("js")) return "Tương tác động mạnh mẽ, xử lý logic client-side mượt mà và tối ưu.";
  if (n.includes("typescript") || n.includes("ts")) return "Đảm bảo tính chặt chẽ của kiểu dữ liệu, giảm thiểu tối đa lỗi lúc runtime.";
  if (n.includes("react")) return "Xây dựng giao diện dạng component tái sử dụng, tối ưu hóa tốc độ tải trang.";
  if (n.includes("next.js") || n.includes("nextjs")) return "Tối ưu hóa SEO, kết xuất phía máy chủ (SSR) và trải nghiệm người dùng tuyệt vời.";
  if (n.includes("tailwindcss") || n.includes("tailwind")) return "Thiết kế giao diện nhanh chóng, đồng bộ, hiện đại với các utility classes tiện lợi.";
  if (n.includes("node.js") || n.includes("nodejs")) return "Xây dựng server backend mạnh mẽ, ổn định và hiệu năng cao.";
  if (n.includes("express")) return "Xây dựng RESTful API tinh gọn, xử lý request và middleware nhanh chóng.";
  if (n.includes("postgresql") || n.includes("postgres")) return "Lưu trữ dữ liệu có cấu trúc, tối ưu hóa truy vấn phức tạp và toàn vẹn dữ liệu.";
  if (n.includes("mongodb") || n.includes("mongo")) return "Lưu trữ dữ liệu dạng tài liệu linh hoạt, dễ dàng mở rộng theo nhu cầu.";
  if (n.includes("prisma")) return "ORM hiện đại, tự động sinh type-safe queries giúp làm việc với cơ sở dữ liệu dễ dàng.";
  if (n.includes("git")) return "Quản lý mã nguồn chặt chẽ, phối hợp làm việc nhóm hiệu quả qua GitHub.";
  if (n.includes("cloudflare")) return "Tăng tốc độ tải trang toàn cầu và bảo mật DDoS an toàn cho website.";
  if (n.includes("vercel")) return "Triển khai website nhanh chóng, tự động CI/CD mượt mà.";
  if (n.includes("gemini")) return "Tích hợp mô hình AI ngôn ngữ lớn, xử lý và tạo nội dung thông minh.";
  if (n.includes("openai")) return "Tích hợp các mô hình trí tuệ nhân tạo tiên tiến vào ứng dụng thực tế.";
  return "Liên tục cập nhật và nâng cao kiến thức công nghệ mới mỗi ngày.";
};

export default function Skills({ skills }: SkillsProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("All");

  const categories: { label: string; value: CategoryType }[] = [
    { label: "TẤT CẢ", value: "All" },
    { label: "FRONTEND", value: "Frontend" },
    { label: "BACKEND", value: "Backend" },
    { label: "DATABASE", value: "Database" },
    { label: "CLOUD", value: "Cloud" },
    { label: "INTELLIGENCE", value: "AI" },
    { label: "TOOLS", value: "Tools" },
  ];

  const filteredSkills = skills.filter((skill) => {
    if (activeCategory === "All") return true;
    return skill.category === activeCategory;
  });

  // Map icon names to lucide icons
  const getIcon = (category: string) => {
    switch (category) {
      case "Frontend":
        return <Code2 className="w-4 h-4 text-cyan-400" />;
      case "Backend":
        return <Server className="w-4 h-4 text-blue-400" />;
      case "Database":
        return <Database className="w-4 h-4 text-cyan-400" />;
      case "Cloud":
        return <Cloud className="w-4 h-4 text-emerald-400" />;
      case "AI":
        return <Bot className="w-4 h-4 text-yellow-400" />;
      default:
        return <Wrench className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <section id="skills" className="relative py-20 border-t border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-12 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-cyan-400"></span>
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest">// SKILLS_MATRIX</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            KỸ NĂNG &amp; CÔNG NGHỆ
          </h2>
        </div>

        {/* Filter categories tabs */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-10 pb-2 border-b border-gray-800/60">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`font-mono text-[10px] sm:text-xs font-bold px-4 py-2 rounded transition-all duration-300 border uppercase tracking-wider ${
                activeCategory === cat.value
                  ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                  : "bg-gray-950/40 border-gray-800/80 text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.length > 0 ? (
            filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="group relative bg-gray-950/45 border border-blue-500/10 hover:border-cyan-400/30 p-5 rounded-lg backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:-translate-y-0.5"
              >
                {/* Tech Item Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded bg-gray-900/80 border border-gray-800">
                      {getIcon(skill.category)}
                    </div>
                    <span className="font-sans font-bold text-sm text-white tracking-wide">
                      {skill.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {skill.level}%
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="relative w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800/60">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>

                {/* Cheeky Review Comment */}
                <p className="mt-3.5 font-sans text-[11px] text-cyan-400/90 leading-relaxed italic group-hover:text-cyan-300 transition-colors duration-200">
                  💬 {getCheekyReview(skill.name)}
                </p>

                {/* Cyber decoration accents */}
                <span className="absolute bottom-1.5 right-2 font-mono text-[8px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  SYS_SKILL_ID_ {skill.id.substring(0, 4).toUpperCase()}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center border border-dashed border-gray-800 rounded-lg">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                // NO SKILLS FOUND IN THIS INDEX
              </span>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
