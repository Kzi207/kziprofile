import React from "react";
import { Briefcase, Calendar, Terminal, MapPin } from "lucide-react";
import { Experience } from "../types";

interface ExperienceProps {
  experiences: Experience[];
}

export default function ExperienceSection({ experiences }: ExperienceProps) {
  return (
    <section id="experience" className="relative py-20 border-t border-purple-500/10 bg-[#0a0518]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-cyan-400"></span>
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest">// DEPLOYMENT_HISTORY</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            KINH NGHIỆM THỰC CHIẾN
          </h2>
        </div>

        {/* Timeline Grid layout */}
        <div className="space-y-8 max-w-5xl mx-auto">
          {experiences.length > 0 ? (
            experiences.map((exp) => (
              <div
                key={exp.id}
                className="group relative flex flex-col md:flex-row bg-gray-950/45 border border-purple-500/10 hover:border-purple-500/35 p-6 rounded-lg backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]"
              >
                {/* Left metadata column */}
                <div className="w-full md:w-64 mb-4 md:mb-0 space-y-1 md:pr-6 border-b md:border-b-0 md:border-r border-gray-900 pb-4 md:pb-0">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="font-mono text-[9px] font-bold tracking-wider uppercase">
                      {exp.current ? "ACTIVE_NODE" : "NODE_COMPLETED"}
                    </span>
                  </div>

                  <h4 className="font-sans font-extrabold text-base text-white pt-2 uppercase">
                    {exp.company}
                  </h4>

                  <div className="flex items-center text-xs text-gray-500 font-mono gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {exp.startDate} &mdash; {exp.current ? "HIỆN TẠI" : exp.endDate}
                    </span>
                  </div>
                </div>

                {/* Right descriptions column */}
                <div className="flex-1 md:pl-8 space-y-3">
                  <h3 className="font-sans font-extrabold text-lg text-white group-hover:text-cyan-400 transition-colors duration-200 uppercase tracking-wide">
                    {exp.position}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {exp.description}
                  </p>
                </div>

                {/* Micro tech code tag decorative absolute */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 font-mono text-[8px] text-gray-700 select-none transition-opacity duration-300">
                  SYS_DEPLOY_REF_{exp.id.substring(0, 5).toUpperCase()}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center border border-dashed border-gray-800 rounded-lg">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                // EXPERIENCE DATA NOT YET INDEXED
              </span>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
