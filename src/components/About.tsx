import React from "react";
import { User, Mail, MapPin, Calendar, Terminal, Info, Award } from "lucide-react";
import { UserProfile } from "../types";

interface AboutProps {
  profile: UserProfile | null;
}

export default function About({ profile }: AboutProps) {
  if (!profile) return null;

  const getBirthYear = (birthdayStr?: string | null) => {
    if (!birthdayStr) return "2007";
    const match = birthdayStr.match(/\d{4}/);
    if (match) {
      return match[0];
    }
    const parts = birthdayStr.split(/[-/]/);
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length === 4 && !isNaN(Number(lastPart))) {
      return lastPart;
    }
    return "2007";
  };

  const infoItems = [
    { label: "BÍ DANH", value: profile.nickname || "N/A", icon: User, color: "text-cyan-400" },
    { label: "NGÀY SINH", value: profile.birthday || "N/A", icon: Calendar, color: "text-blue-400" },
    { label: "EMAIL", value: profile.email || "N/A", icon: Mail, color: "text-cyan-400" },
    { label: "VỊ TRÍ", value: profile.address || "N/A", icon: MapPin, color: "text-emerald-400" },
  ];

  return (
    <section id="about" className="relative py-20 border-t border-cyan-500/10 bg-[#070d1d]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-cyan-400"></span>
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest">// ABOUT_ME_FILE</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            HỒ SƠ CÁ NHÂN
          </h2>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Visual Left Frame - Anime Sticker Board */}
          <div className="lg:col-span-5 flex justify-center py-8">
            <div className="relative w-full max-w-[280px] aspect-[4/5] flex items-center justify-center">
              {/* Background abstract decoration sticker circle */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-purple-600/20 to-pink-500/20 blur-xl pointer-events-none" />
              
              {/* Main Polaroid Photo Sticker */}
              <div className="relative bg-white p-3.5 pb-10 rounded-lg shadow-[8px_8px_0px_rgba(244,63,94,0.3)] border border-gray-100 -rotate-3 hover:rotate-0 hover:scale-105 hover:shadow-[10px_10px_0px_rgba(34,211,238,0.3)] transition-all duration-300 w-full z-10">
                <div className="aspect-square rounded overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={profile.avatar || "https://files.catbox.moe/5f5zq9.jpg"}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Written text tag */}
                <div className="mt-4 text-center">
                  <span className="font-mono text-xs font-black tracking-widest text-gray-800 uppercase block">
                    {profile.nickname || "KZI"} • 2007
                  </span>
                </div>
              </div>

              {/* STICKER 1: Location Badge */}
              <div className="absolute -top-6 -right-4 bg-emerald-400 text-black font-sans font-black text-[11px] sm:text-xs px-3.5 py-1.5 rounded-lg border-2 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)] rotate-6 hover:scale-115 hover:rotate-12 transition-all duration-200 cursor-default select-none z-20">
                Cần Thơ 📍
              </div>

              {/* STICKER 2: Student Badge */}
              <div className="absolute bottom-12 -left-8 bg-blue-500 text-white font-sans font-black text-[11px] sm:text-xs px-4 py-1.5 rounded-full border-2 border-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)] -rotate-12 hover:scale-115 hover:-rotate-18 transition-all duration-200 cursor-default select-none z-20">
                Cơ Điện Tử ⚙️
              </div>

              {/* STICKER 3: Round Passion Badge */}
              <div className="absolute -bottom-6 right-0 w-20 h-20 bg-yellow-400 text-black rounded-full border-4 border-white flex flex-col items-center justify-center font-sans font-black text-[11px] tracking-tight shadow-[4px_4px_0px_rgba(0,0,0,0.25)] rotate-12 hover:scale-115 hover:rotate-6 transition-all duration-200 cursor-default select-none z-20">
                <span>PASSION</span>
                <span className="text-sm">100% 🔥</span>
              </div>
            </div>
          </div>

          {/* Details Right Block */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <h3 className="font-sans font-bold text-2xl text-white uppercase flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
                Sinh Viên Công Nghệ &amp; Lập Trình Viên Đam Mê Sáng Tạo
              </h3>
              <p className="text-gray-300 leading-relaxed font-sans text-sm sm:text-base">
                Chào mừng bồ tèo đến với không gian sáng tạo của tớ. Tớ là{" "}
                <strong className="text-cyan-400 font-bold">{profile.name}</strong> (biệt danh là <strong className="text-cyan-400 font-bold">{profile.nickname}</strong>), sinh năm {getBirthYear(profile.birthday)}, hiện là sinh viên ngành Công nghệ Kỹ thuật Cơ điện tử tại Cần Thơ.
              </p>
              <p className="text-gray-300 leading-relaxed font-sans text-sm sm:text-base">
                Mặc dù ngành học chính quy liên quan đến thiết kế hệ thống cơ khí, mạch điện tử và điều khiển tự động hóa, tớ lại có một niềm đam mê mãnh liệt đối với lập trình Web Full-stack, xây dựng bot tự động và tích hợp các giải pháp AI. Tớ luôn không ngừng tự học và nỗ lực tạo ra những sản phẩm công nghệ hữu ích, chỉn chu nhất.
              </p>
            </div>

            {/* Profile Information List (Glass Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {infoItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center space-x-4 bg-gray-950/45 border border-blue-500/10 hover:border-cyan-400/35 p-4 rounded-lg backdrop-blur-sm hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-300"
                  >
                    <div className={`p-2.5 rounded bg-gray-900/60 border border-gray-800 ${item.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[9px] text-gray-500 tracking-wider block">
                        {item.label}
                      </span>
                      <span className="font-sans font-semibold text-sm text-white">
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Metrics badge */}
            <div className="flex flex-wrap gap-4 border-t border-cyan-500/10 pt-6">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-cyan-400 animate-bounce" />
                <span className="font-sans text-xs text-gray-400">
                  <strong className="text-white font-bold">500+ Giờ</strong> Lập Trình &amp; Sáng Tạo Hệ Thống
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="font-sans text-xs text-gray-400">
                  <strong className="text-white font-bold">Mục Tiêu Tối Thượng:</strong> Tạo Ra Các Sản Phẩm Mang Lại Giá Trị Cho Cộng Đồng
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
