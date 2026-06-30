import React, { useState } from "react";
import { Search, Github, ExternalLink, X, ChevronLeft, ChevronRight, Eye, Code } from "lucide-react";
import { Project } from "../types";

interface ProjectsProps {
  projects: Project[];
}

export default function Projects({ projects }: ProjectsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Lightbox view state
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Extract unique categories
  const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.techStack.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || project.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Paginated projects
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const displayedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openLightbox = (project: Project) => {
    setActiveProject(project);
    setActiveImageIdx(0);
  };

  const closeLightbox = () => {
    setActiveProject(null);
  };

  const nextImage = () => {
    if (!activeProject) return;
    setActiveImageIdx((prev) => (prev + 1) % activeProject.gallery.length);
  };

  const prevImage = () => {
    if (!activeProject) return;
    setActiveImageIdx((prev) => (prev - 1 + activeProject.gallery.length) % activeProject.gallery.length);
  };

  return (
    <section id="projects" className="relative py-20 border-t border-purple-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-12 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-pink-500"></span>
            <span className="font-mono text-xs text-pink-500 uppercase tracking-widest">// SYSTEM_SHOWCASE</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            DỰ ÁN TIÊU BIỂU
          </h2>
          <p className="font-mono text-[11px] sm:text-xs text-pink-400 mt-3 max-w-3xl leading-relaxed italic border-l-2 border-pink-500/50 pl-3">
            ✨ SẢN PHẨM SÁNG TẠO: Danh sách các dự án thực tế do tớ tự tay thiết kế, phát triển và tối ưu hóa trong quá trình học tập lập trình.
          </p>
        </div>

        {/* Filters and Search Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 bg-gray-950/40 p-4 rounded-lg border border-purple-500/10 backdrop-blur-sm">
          {/* Categories Tab Row */}
          <div className="flex flex-wrap items-center gap-1.5 order-2 md:order-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`font-mono text-[9px] sm:text-[10px] font-bold px-3.5 py-1.5 rounded uppercase tracking-wider transition-all duration-300 ${
                  selectedCategory === cat
                    ? "bg-pink-500/15 border border-pink-500 text-pink-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                    : "bg-gray-900/60 border border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {cat === "All" ? "TẤT CẢ" : cat}
              </button>
            ))}
          </div>

          {/* Search bar input */}
          <div className="relative w-full md:w-72 order-1 md:order-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, công nghệ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-500 rounded font-sans text-xs text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedProjects.length > 0 ? (
            displayedProjects.map((project) => (
              <div
                key={project.id}
                className="group relative flex flex-col bg-gray-950/50 border border-purple-500/10 hover:border-cyan-400/40 rounded-lg overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] hover:-translate-y-1"
              >
                {/* Thumbnail visual element */}
                <div className="relative aspect-video overflow-hidden bg-gray-900 border-b border-gray-900">
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
                    referrerPolicy="no-referrer"
                  />
                  {/* Category overlay label */}
                  <span className="absolute top-2.5 left-2.5 font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-black/85 border border-purple-500/50 text-purple-300">
                    {project.category.toUpperCase()}
                  </span>

                  {/* Lightbox Trigger hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 gap-3">
                    <button
                      onClick={() => openLightbox(project)}
                      className="p-2.5 rounded-full bg-cyan-400 text-black hover:bg-white transition-all duration-200 cursor-pointer shadow-lg"
                      title="Xem chi tiết bộ sưu tập"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-full bg-pink-500 text-white hover:bg-white hover:text-pink-500 transition-all duration-200 shadow-lg"
                        title="GitHub code repository"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Info Text block */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-sans font-extrabold text-base text-white tracking-wide group-hover:text-cyan-400 transition-colors duration-200">
                      {project.title}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  </div>

                  {/* Tech stacks pills */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {project.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="font-mono text-[8px] font-bold px-2 py-0.5 rounded border border-gray-800 bg-gray-900 text-gray-400"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Actions links line */}
                    <div className="flex items-center justify-between border-t border-gray-900/60 pt-3 text-[11px] font-mono font-bold tracking-wider uppercase">
                      <button
                        onClick={() => openLightbox(project)}
                        className="text-cyan-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
                      >
                        <Code className="w-3.5 h-3.5" />
                        CHI TIẾT
                      </button>
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pink-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
                        >
                          LIVE DEMO
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Decorative border bottom */}
                <div className="h-[2px] w-full bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 opacity-20 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center border border-dashed border-gray-800 rounded-lg">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                // NO PROJECTS MATCH CRITERIA MATRIX
              </span>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-800 bg-gray-950/45 text-gray-400 hover:text-white hover:border-gray-700 disabled:opacity-30 rounded transition-colors duration-150 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-gray-400 font-bold">
              PAGE {currentPage} OF {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-800 bg-gray-950/45 text-gray-400 hover:text-white hover:border-gray-700 disabled:opacity-30 rounded transition-colors duration-150 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Lightbox Image Preview Dialog / Modal */}
      {activeProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-4xl w-full bg-[#0a0518] border border-purple-500/40 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col md:flex-row">
            
            {/* Left side Image visual carousel */}
            <div className="flex-1 relative aspect-video md:aspect-auto bg-black flex items-center justify-center p-2 border-r border-gray-900">
              {activeProject.gallery && activeProject.gallery.length > 0 ? (
                <img
                  src={activeProject.gallery[activeImageIdx]}
                  alt={`${activeProject.title} screenshot`}
                  className="max-h-[60vh] object-contain rounded"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img
                  src={activeProject.thumbnail}
                  alt={activeProject.title}
                  className="max-h-[60vh] object-contain rounded"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Navigation Arrows for screenshots gallery */}
              {activeProject.gallery && activeProject.gallery.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/80 hover:bg-pink-500 text-white rounded-full transition-colors duration-150 cursor-pointer shadow"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/80 hover:bg-pink-500 text-white rounded-full transition-colors duration-150 cursor-pointer shadow"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {/* Indicator bubbles */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5">
                    {activeProject.gallery.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          activeImageIdx === idx ? "bg-cyan-400 w-4" : "bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right side technical detail context */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between space-y-6 bg-gray-950/50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 uppercase">
                    {activeProject.category}
                  </span>
                  <button
                    onClick={closeLightbox}
                    className="p-1 text-gray-500 hover:text-white rounded hover:bg-gray-900 transition-colors duration-150 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-sans font-black text-xl text-white uppercase tracking-tight">
                    {activeProject.title}
                  </h3>
                  <p className="font-sans text-xs text-gray-400 leading-relaxed max-h-[25vh] overflow-y-auto pr-1">
                    {activeProject.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-mono text-[9px] text-gray-500 font-bold tracking-widest uppercase">
                    // TECH_STACK_MATRIX
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {activeProject.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="font-mono text-[8px] font-bold px-2 py-0.5 rounded border border-gray-800 bg-gray-900 text-gray-400"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center gap-3 border-t border-gray-900 pt-4">
                {activeProject.githubUrl && (
                  <a
                    href={activeProject.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-xs font-bold bg-gray-900 border border-gray-800 hover:border-gray-700 text-white rounded transition-colors duration-150"
                  >
                    <Github className="w-4 h-4" />
                    REPOSITORY
                  </a>
                )}
                {activeProject.demoUrl && (
                  <a
                    href={activeProject.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 rounded transition-colors duration-150 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  >
                    LIVE DEMO
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
