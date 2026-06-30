import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

interface Sakura {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  rotate: number;
}

export default function CyberBackground() {
  const [sakuras, setSakuras] = useState<Sakura[]>([]);

  useEffect(() => {
    // Generate a fixed set of floating elements for performant rendering
    const list: Sakura[] = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage-based width
      y: -10, // start above the viewport
      size: Math.random() * 10 + 6, // 6px to 16px
      delay: Math.random() * 8,
      duration: Math.random() * 12 + 8, // 8s to 20s
      rotate: Math.random() * 360,
    }));
    setSakuras(list);
  }, []);

  return (
    <div id="anime-sky-bg" className="fixed inset-0 -z-50 overflow-hidden bg-gradient-to-b from-[#070b19] via-[#0d1a33] via-[#183152] via-[#294c7a] via-[#436fa8] via-[#6ba0d6] to-[#a3cdf5] pointer-events-none">
      {/* Deep Space / Twilight Sun Glowing Effects */}
      <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-t from-[#b8dcf2]/25 to-transparent blur-[120px]" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-t from-[#67e8f9]/15 to-transparent blur-[100px]" />
      <div className="absolute top-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="absolute top-[10%] right-[5%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />

      {/* Anime Stylized Dreamy Floating Clouds */}
      <motion.div
        className="absolute rounded-full bg-gradient-to-r from-cyan-100/20 via-white/10 to-transparent blur-md"
        style={{ top: "35%", left: "5%", width: "280px", height: "90px" }}
        animate={{ x: [0, 60, 0] }}
        transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full bg-gradient-to-r from-blue-300/15 via-white/10 to-transparent blur-lg"
        style={{ top: "20%", right: "12%", width: "360px", height: "120px" }}
        animate={{ x: [0, -70, 0] }}
        transition={{ duration: 55, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full bg-gradient-to-r from-cyan-200/15 via-blue-100/10 to-transparent blur-lg"
        style={{ bottom: "28%", left: "25%", width: "450px", height: "130px" }}
        animate={{ x: [0, 85, 0] }}
        transition={{ duration: 65, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Cyber Grid Pattern - highly subtle for tech-anime vibe */}
      <div 
        className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]"
        style={{
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)",
        }}
      />

      {/* Sunset Horizon Blend */}
      <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-[#a3cdf5]/20 to-transparent border-t border-cyan-400/10 opacity-40" />

      {/* Anime Sunset Crescent Moon */}
      <div className="absolute top-[8%] right-[12%] w-14 h-14 opacity-80 select-none pointer-events-none filter drop-shadow-[0_0_12px_rgba(254,240,138,0.5)]">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-yellow-100">
          <path
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Anime City Silhouettes (Cohesive sunset shades) */}
      <div className="absolute bottom-0 left-0 w-full h-48 opacity-[0.12] flex items-end overflow-hidden">
        <div className="flex w-[200%] animate-[slide_120s_linear_infinite]">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-1/2 h-full flex items-end justify-between px-2">
              <div className="w-12 h-32 bg-[#0a182b] clip-city-1" />
              <div className="w-16 h-40 bg-[#122640] clip-city-2" />
              <div className="w-20 h-24 bg-[#1a385c] clip-city-3" />
              <div className="w-10 h-36 bg-[#0a182b] clip-city-1" />
              <div className="w-24 h-28 bg-[#122640] clip-city-2" />
              <div className="w-14 h-48 bg-[#234b75] clip-city-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Stars Particles */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-white rounded-full animate-ping [animation-duration:4s]" />
        <div className="absolute top-1/3 left-[70%] w-1.5 h-1.5 bg-cyan-200 rounded-full animate-pulse [animation-duration:3s]" />
        <div className="absolute top-1/5 left-[15%] w-1 h-1 bg-yellow-100 rounded-full animate-pulse [animation-duration:5s]" />
        <div className="absolute top-1/2 left-[80%] w-1 h-1 bg-cyan-100 rounded-full animate-ping [animation-duration:3.5s]" />
      </div>

      {/* Floating Sakura Petals with Framer Motion */}
      {sakuras.map((sakura) => (
        <motion.div
          key={sakura.id}
          className="absolute rounded-full bg-gradient-to-tr from-cyan-300 to-blue-200 shadow-[0_0_8px_rgba(103,232,249,0.5)]"
          style={{
            width: sakura.size,
            height: sakura.size * 0.7,
            left: `${sakura.x}%`,
            top: `${sakura.y}%`,
          }}
          initial={{ y: -20, x: `${sakura.x}%`, rotate: sakura.rotate, opacity: 0.8 }}
          animate={{
            y: ["0vh", "110vh"],
            x: [
              `${sakura.x}%`,
              `${sakura.x + (sakura.id % 2 === 0 ? 8 : -8)}%`,
              `${sakura.x + (sakura.id % 2 === 0 ? -4 : 4)}%`
            ],
            rotate: sakura.rotate + 360,
          }}
          transition={{
            duration: sakura.duration,
            delay: sakura.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
