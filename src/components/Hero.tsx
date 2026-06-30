import React, { useEffect, useState } from "react";
import { Github, Facebook, Music2, Sparkles, Terminal, FileText } from "lucide-react";
import { motion } from "motion/react";
import { UserProfile } from "../types";

interface HeroProps {
  profile: UserProfile | null;
  heroTitle?: string;
  heroSubtitle?: string;
  statusActive?: string;
}

export default function Hero({ profile, heroTitle, heroSubtitle, statusActive }: HeroProps) {
  const [typedText, setTypedText] = useState("");
  const subtitleOptions = [
    heroSubtitle && heroSubtitle !== "Full-stack Developer & AI Enthusiast" ? heroSubtitle : "XIN CHÀO BỒ TÈO! 👋",
    "LẬP TRÌNH VIÊN CƠ ĐIỆN TỬ ⚙️",
    "ĐAM MÊ VIẾT WEB FULL-STACK 💻",
    "THIẾT KẾ GIAO DIỆN TỐI GIẢN & MƯỢT MÀ ✨",
    "CHẾ TẠO CÁC SẢN PHẨM SỬ DỤNG AI TRÍ TUỆ NHÂN TẠO 🤖",
    "GÕ CODE HĂNG SAY - BUG BAY TRONG MỘT NỐT NHẠC 🚀"
  ];
  const [optionIdx, setOptionIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);



  useEffect(() => {
    const currentFullText = subtitleOptions[optionIdx];
    let timer: NodeJS.Timeout;

    if (isDeleting) {
      timer = setTimeout(() => {
        setTypedText(currentFullText.substring(0, charIdx - 1));
        setCharIdx(prev => prev - 1);
      }, 50);
    } else {
      timer = setTimeout(() => {
        setTypedText(currentFullText.substring(0, charIdx + 1));
        setCharIdx(prev => prev + 1);
      }, 100);
    }

    if (!isDeleting && charIdx === currentFullText.length) {
      // Pause at full text
      timer = setTimeout(() => setIsDeleting(true), 1500);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setOptionIdx(prev => (prev + 1) % subtitleOptions.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, optionIdx, heroSubtitle]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative min-h-[90vh] flex items-center justify-center pt-28 pb-12 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center gap-8">
          
          {/* Text and Actions */}
          <div className="space-y-6 flex flex-col items-center">
            {/* Status Alert Badge */}
            <div className="inline-flex items-center space-x-2 border border-pink-500/30 bg-pink-500/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-spin" />
              <span className="font-mono text-[10px] text-pink-400 font-bold tracking-widest uppercase">
                {statusActive || "OPEN FOR COLLABORATION"}
              </span>
            </div>

            {/* Title / Name */}
            <div className="space-y-2">
              <h1 className="font-sans font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight text-white uppercase leading-none">
                {heroTitle || profile?.name || "LÊ KHÁNH DUY"}
              </h1>
              <p className="font-mono text-pink-500 text-sm font-semibold tracking-wider">
                // CALL_SIGN: <span className="text-white">{profile?.nickname || "Kzi"}</span>
              </p>
            </div>

            {/* Typing Effect Subtitle */}
            <div className="h-12 flex items-center justify-center">
              <span className="font-mono text-lg sm:text-2xl text-cyan-400 font-bold tracking-wider">
                &gt; {typedText}
                <span className="animate-pulse font-light ml-0.5 text-white">|</span>
              </span>
            </div>

            {/* Bio introduction */}
            <p className="text-gray-300 max-w-2xl text-sm sm:text-base leading-relaxed font-sans font-normal border-y border-purple-500/20 py-4 px-6 bg-purple-950/5 rounded-lg">
              {profile?.bio || "Đang tải dữ liệu tiểu sử..."}
            </p>

            {/* CTA Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => scrollToSection("projects")}
                className="relative group px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black bg-cyan-400 rounded cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  XEM CHI TIẾT DỰ ÁN
                </span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0" />
              </button>

              <button
                onClick={() => scrollToSection("contact")}
                className="px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-pink-400 border border-pink-500/40 bg-pink-500/5 hover:bg-pink-500/15 rounded cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                GỬI TIN NHẮN LIÊN HỆ //
              </button>
            </div>

            {/* Social Channels */}
            <div className="flex items-center justify-center space-x-4 pt-6">
              <a
                href={profile?.socialGithub || "https://github.com"}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-200"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href={profile?.socialLinkedin || "https://www.facebook.com/kzi207"}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-200"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={profile?.socialTwitter || "https://www.tiktok.com/@kzi207"}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-200"
                title="TikTok"
              >
                <Music2 className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
