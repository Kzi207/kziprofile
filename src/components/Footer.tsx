import React, { useState, useEffect } from "react";
import { Terminal, ShieldCheck } from "lucide-react";

export default function Footer() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="relative bg-[#070312] border-t border-purple-500/10 py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Copyright section */}
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <Terminal className="w-4 h-4 text-pink-500 animate-pulse" />
              <span className="font-mono text-xs text-white font-bold tracking-wider">
                Khánh Duy
              </span>
            </div>
            <p className="font-sans text-[11px] text-gray-500">
              &copy; {new Date().getFullYear()} Lê Khánh Duy (Kzi). Thiết kế giao diện phong cách Sticker Anime &amp; Lập Trình Sáng Tạo.
            </p>
          </div>

          {/* Real-time indicator clock & build tag */}
          <div className="flex flex-col items-center md:items-end space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded border border-cyan-500/20 bg-cyan-500/5 font-mono text-[10px] text-cyan-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
              </span>
              <span>{time}</span>
            </div>
            <p className="font-mono text-[9px] text-gray-600 tracking-widest uppercase">
              HỆ THỐNG PHÁT TRIỂN TRÊN NỀN TẢNG NEON &amp; PRISMA ⚡
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
