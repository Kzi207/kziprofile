import React from "react";
import { CheckCircle2, RefreshCw, Star, ArrowUpRight } from "lucide-react";
import { Roadmap } from "../types";

interface RoadmapProps {
  roadmaps: Roadmap[];
}

export default function RoadmapSection({ roadmaps }: RoadmapProps) {
  // Sort roadmaps by order
  const sortedRoadmaps = [...roadmaps].sort((a, b) => a.order - b.order);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "Learning":
        return <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin [animation-duration:10s]" />;
      default:
        return <Star className="w-5 h-5 text-cyan-400 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            COMPLETED
          </span>
        );
      case "Learning":
        return (
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
            LEARNING_MODE
          </span>
        );
      default:
        return (
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            FUTURE_GOAL
          </span>
        );
    }
  };

  return (
    <section id="roadmap" className="relative py-20 border-t border-purple-500/10 bg-[#0a0518]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-pink-500"></span>
            <span className="font-mono text-xs text-pink-500 uppercase tracking-widest">// MISSION_OBJECTIVES_4869</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            HÀNH TRÌNH PHÁ ÁN &amp; HỌC TẬP
          </h2>
        </div>

        {/* Timeline Layout */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical Center Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500 via-cyan-400 to-pink-500 opacity-20" />

          <div className="space-y-12">
            {sortedRoadmaps.length > 0 ? (
              sortedRoadmaps.map((node, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div
                    key={node.id}
                    className={`relative flex flex-col md:flex-row items-start ${
                      isEven ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Node status point dot */}
                    <div className="absolute left-4 md:left-1/2 -translate-x-[9.5px] z-10 flex items-center justify-center w-5 h-5 rounded-full bg-[#0a0518] border border-purple-500">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        node.status === "Completed" ? "bg-emerald-500" : node.status === "Learning" ? "bg-yellow-500" : "bg-cyan-400"
                      }`} />
                    </div>

                    {/* Timeline Item Content Card */}
                    <div className="w-full md:w-1/2 pl-12 md:pl-0 md:px-8">
                      <div className="group relative bg-gray-950/60 border border-purple-500/10 hover:border-purple-500/30 p-6 rounded-lg backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        
                        {/* Header metadata row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          {getStatusBadge(node.status)}
                          {node.date && (
                            <span className="font-mono text-[10px] text-gray-500 font-semibold tracking-wider">
                              [ {node.date} ]
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-sans font-bold text-lg text-white mb-2 group-hover:text-pink-400 transition-colors duration-200">
                          {node.title}
                        </h3>
                        <p className="font-sans text-xs sm:text-sm text-gray-400 leading-relaxed">
                          {node.description || "Chưa bổ sung thông tin chi tiết lộ trình."}
                        </p>

                        {/* Order indicator */}
                        <div className="absolute bottom-1 right-2 font-mono text-[24px] text-gray-900 font-black opacity-30 select-none">
                          #{node.order}
                        </div>
                      </div>
                    </div>

                    {/* Empty block to fill space on desktop */}
                    <div className="hidden md:block w-1/2" />
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center border border-dashed border-gray-800 rounded-lg">
                <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                  // NO ROADMAP DIRECTIVES ENCODED
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
