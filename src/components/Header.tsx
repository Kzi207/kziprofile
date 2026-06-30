import React, { useState, useEffect } from "react";
import { 
  Menu, X, Terminal, Eye, User, Server, Layers, 
  ListTodo, Calendar, Award, Mail, Settings, LogOut 
} from "lucide-react";
import AudioPlayer from "./AudioPlayer";

interface HeaderProps {
  isAdminView: boolean;
  onToggleAdminView: () => void;
  siteTitle?: string;
  isLoggedIn: boolean;
  hasCertificates?: boolean;
  activeAdminTab?: string;
  setActiveAdminTab?: (tab: any) => void;
  onLogout?: () => void;
  musicLinksString?: string;
}

export default function Header({ 
  isAdminView, onToggleAdminView, siteTitle, isLoggedIn, hasCertificates = false,
  activeAdminTab = "profile", setActiveAdminTab, onLogout, musicLinksString
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  const navItems = [
    { label: "NĂNG LỰC", id: "hero" },
    { label: "GIỚI THIỆU", id: "about" },
    { label: "KỸ NĂNG", id: "skills" },
    { label: "LỘ TRÌNH", id: "roadmap" },
    { label: "DỰ ÁN", id: "projects" },
    { label: "KINH NGHIỆM", id: "experience" },
    ...(hasCertificates ? [{ label: "CHỨNG CHỈ", id: "certificates" }] : []),
    { label: "LIÊN HỆ", id: "contact" },
  ];

  const adminTabs = [
    { tab: "profile", label: "HỒ SƠ CÁ NHÂN", icon: User },
    { tab: "skills", label: "QUẢN LÝ KỸ NĂNG", icon: Server },
    { tab: "projects", label: "DỰ ÁN TIÊU BIỂU", icon: Layers },
    { tab: "roadmaps", label: "LỘ TRÌNH HỌC TẬP", icon: ListTodo },
    { tab: "experiences", label: "KINH NGHIỆM", icon: Calendar },
    { tab: "certificates", label: "CHỨNG CHỈ", icon: Award },
    { tab: "messages", label: "TIN NHẮN LIÊN HỆ", icon: Mail },
    { tab: "settings", label: "CÀI ĐẶT CHUNG", icon: Settings },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkIsDesktop();
    
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", checkIsDesktop);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkIsDesktop);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = window.innerWidth >= 1024 ? 20 : 70; // 20px padding on desktop, 70px on mobile
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleAdminTabClick = (tab: string) => {
    setIsOpen(false);
    if (setActiveAdminTab) {
      setActiveAdminTab(tab);
    }
  };

  return (
    <>
      {/* --- DESKTOP SIDEBAR MENU --- */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 xl:w-72 bg-[#070d1d]/90 backdrop-blur-md border-r border-cyan-500/20 py-8 px-6 flex-col justify-between z-50 shadow-[4px_0_30px_rgba(0,0,0,0.5)] overflow-y-auto scrollbar-none">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => !isAdminView && scrollToSection("hero")}>
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-bold text-xl shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              <img src="https://files.catbox.moe/5f5zq9.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <span className="absolute -inset-0.5 rounded-full bg-cyan-400/20 blur animate-pulse pointer-events-none" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-black text-lg tracking-wider text-white">
                {siteTitle ? siteTitle.split("//")[0].trim() : "Kzi"}
              </span>
              <span className="text-[9px] text-cyan-400 border border-cyan-400/30 rounded bg-cyan-400/10 px-1 py-0.5 mt-0.5 self-start font-mono uppercase tracking-widest">
                OTAKU v1.0 🤖
              </span>
            </div>
          </div>

          {/* Navigation links - Vertical stack */}
          {isAdminView && isLoggedIn ? (
            /* Admin view navigation sidebar */
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] text-gray-500 tracking-widest font-bold uppercase mb-3 block">
                // PHÂN HỆ QUẢN TRỊ
              </span>
              {adminTabs.map((item) => {
                const IconComponent = item.icon;
                const isSelected = activeAdminTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleAdminTabClick(item.tab)}
                    className={`w-full flex items-center space-x-3 font-mono text-xs text-left px-3.5 py-2.5 rounded transition-all duration-200 uppercase tracking-wider ${
                      isSelected
                        ? "bg-cyan-500/15 border-l-2 border-cyan-400 text-cyan-300"
                        : "text-gray-400 hover:text-white hover:bg-cyan-500/5 hover:translate-x-1"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Public view navigation sidebar */
            !isAdminView && (
              <div className="flex flex-col space-y-1.5">
                <span className="font-mono text-[9px] text-gray-500 tracking-widest font-bold uppercase mb-3 block">
                  // MENU ĐIỀU HƯỚNG
                </span>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="font-mono text-xs text-left px-3 py-3 rounded text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/5 hover:translate-x-1.5 transition-all duration-200 tracking-wider font-semibold border-l-2 border-transparent hover:border-cyan-400 flex items-center space-x-2"
                  >
                    <span className="opacity-40 text-[10px] font-normal">&gt;</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer actions / status in Sidebar */}
        <div className="space-y-4 shrink-0 mt-6">
          {/* Audio Player */}
          {isDesktop && <AudioPlayer musicLinksString={musicLinksString} />}

          {/* System Live Status */}
          <div className="flex items-center space-x-2.5 border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 rounded">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-mono text-[9px] text-cyan-400 tracking-widest uppercase font-bold">
              KÍNH ĐỊNH VỊ: ON 🕶️
            </span>
          </div>

          {/* Admin toggle / Logout buttons */}
          <div className="space-y-2">
            <button
              onClick={onToggleAdminView}
              className={`w-full flex items-center justify-center space-x-2 font-mono text-[10px] tracking-wider uppercase py-2.5 px-4 rounded border transition-all duration-300 ${
                isAdminView
                  ? "bg-cyan-500/15 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  : isLoggedIn
                  ? "bg-blue-500/15 border-blue-400 text-blue-300 hover:bg-blue-500/30"
                  : "bg-gray-800/60 border-gray-700 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400"
              }`}
            >
              {isAdminView ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>XEM PHÁ ÁN</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{isLoggedIn ? "TRẠM CHỈ HUY 🛰️" : "MẬT MÃ ADMIN"}</span>
                </>
              )}
            </button>

            {isAdminView && isLoggedIn && onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 font-mono text-[10px] tracking-wider uppercase py-2.5 px-4 rounded border border-pink-500/40 text-pink-400 hover:bg-pink-500/10 transition-colors duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>THOÁT QUẢN TRỊ</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* --- MOBILE/TABLET HEADER --- */}
      <header
        className={`lg:hidden fixed top-0 left-0 w-full h-16 z-50 transition-all duration-300 flex items-center ${
          isScrolled
            ? "bg-[#070d1d]/85 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent"
        }`}
      >
        <div className="w-full px-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => !isAdminView && scrollToSection("hero")}>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-bold text-lg shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              <img src="https://files.catbox.moe/5f5zq9.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <span className="absolute -inset-0.5 rounded-full bg-cyan-400/20 blur animate-pulse pointer-events-none" />
            </div>
            <span className="font-mono font-black text-sm tracking-wider text-white">
              {siteTitle ? siteTitle.split("//")[0].trim() : "Kzi"}{" "}
              <span className="text-cyan-400 text-[8px] px-1 py-0.5 border border-cyan-400/30 rounded bg-cyan-400/10">
                OTAKU 🤖
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Admin toggle button */}
            <button
              onClick={onToggleAdminView}
              className={`flex items-center space-x-1 font-mono text-[9px] tracking-wider uppercase px-2.5 py-1.5 rounded border transition-all duration-300 ${
                isAdminView
                  ? "bg-cyan-500/15 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30"
                  : isLoggedIn
                  ? "bg-blue-500/15 border-blue-400 text-blue-300"
                  : "bg-gray-800/60 border-gray-700 text-gray-300"
              }`}
            >
              {isAdminView ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>XEM</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{isLoggedIn ? "TRẠM" : "ADMIN"}</span>
                </>
              )}
            </button>

            {/* Mobile menu button */}
            {isLoggedIn && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800/40 focus:outline-none"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            {!isLoggedIn && !isAdminView && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800/40 focus:outline-none"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- MOBILE BACKDROP OVERLAY --- */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* --- MOBILE SLIDE-OUT DRAWER MENU (Vertical layout on mobile/tablet) --- */}
      <aside 
        className={`lg:hidden fixed top-0 left-0 h-screen w-64 max-w-[80vw] bg-[#070d1d]/95 backdrop-blur-md border-r border-cyan-500/20 py-8 px-6 flex flex-col justify-between z-50 shadow-[4px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-8 overflow-y-auto max-h-[85vh]">
          {/* Drawer Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-bold text-lg shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                <img src="https://files.catbox.moe/5f5zq9.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <span className="absolute -inset-0.5 rounded-full bg-cyan-400/20 blur animate-pulse pointer-events-none" />
              </div>
              <span className="font-mono font-black text-sm tracking-wider text-white">
                {siteTitle ? siteTitle.split("//")[0].trim() : "Kzi"}
              </span>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/80 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation links - Vertical stack in mobile drawer */}
          {isAdminView && isLoggedIn ? (
            /* Admin view navigation drawer */
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] text-gray-500 tracking-widest font-bold uppercase mb-2 block">
                // QUẢN TRỊ HỆ THỐNG
              </span>
              {adminTabs.map((item) => {
                const IconComponent = item.icon;
                const isSelected = activeAdminTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleAdminTabClick(item.tab)}
                    className={`w-full flex items-center space-x-3 font-mono text-xs text-left px-3 py-2.5 rounded transition-all duration-200 uppercase tracking-wider ${
                      isSelected
                        ? "bg-cyan-500/15 border-l-2 border-cyan-400 text-cyan-300"
                        : "text-gray-400 hover:text-white hover:bg-cyan-500/5 hover:translate-x-1"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Public view navigation drawer */
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] text-gray-500 tracking-widest font-bold uppercase mb-2 block">
                // MENU ĐIỀU HƯỚNG
              </span>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="font-mono text-xs text-left px-3 py-3 rounded text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/5 hover:translate-x-1.5 transition-all duration-200 tracking-wider font-semibold border-l-2 border-transparent hover:border-cyan-400 flex items-center space-x-2"
                >
                  <span className="opacity-40 text-[10px] font-normal">&gt;</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions / status in Mobile Drawer */}
        <div className="space-y-4 shrink-0 mt-4">
          {/* Audio Player */}
          {!isDesktop && <AudioPlayer musicLinksString={musicLinksString} />}

          {/* System Live Status */}
          <div className="flex items-center space-x-2 border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 rounded">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </span>
            <span className="font-mono text-[8px] text-cyan-400 tracking-widest uppercase font-bold">
              KÍNH ĐỊNH VỊ: ON 🕶️
            </span>
          </div>

          {isAdminView && isLoggedIn && onLogout && (
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center justify-center space-x-2 font-mono text-[10px] tracking-wider uppercase py-2.5 px-4 rounded border border-pink-500/40 text-pink-400 hover:bg-pink-500/10 transition-colors duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>THOÁT QUẢN TRỊ</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
