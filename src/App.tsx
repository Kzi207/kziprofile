import React, { useEffect, useState } from "react";
import { Lock, Terminal, ShieldAlert, Key, Sparkles, Loader, ArrowUp, Activity } from "lucide-react";
import CyberBackground from "./components/CyberBackground";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import RoadmapSection from "./components/Roadmap";
import Projects from "./components/Projects";
import ExperienceSection from "./components/Experience";
import Certificates from "./components/Certificates";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import AdminDashboard from "./components/AdminDashboard";
import { UserProfile, Skill, Project, Roadmap, Experience, Certificate, SiteSettings } from "./types";

export default function App() {
  const [isAdminView, setIsAdminView] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<any>("profile");

  // Core portfolio state variables
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});

  const [loading, setLoading] = useState(true);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Fetch all public system resources
  const fetchAllData = async () => {
    try {
      const pRes = await fetch("/api/profile");
      const pData = await pRes.json();
      if (pData.success) setProfile(pData.data);

      const sRes = await fetch("/api/skills");
      const sData = await sRes.json();
      if (sData.success) setSkills(sData.data);

      const rRes = await fetch("/api/roadmaps");
      const rData = await rRes.json();
      if (rData.success) setRoadmaps(rData.data);

      const jRes = await fetch("/api/projects");
      const jData = await jRes.json();
      if (jData.success) setProjects(jData.data);

      const eRes = await fetch("/api/experiences");
      const eData = await eRes.json();
      if (eData.success) setExperiences(eData.data);

      const cRes = await fetch("/api/certificates");
      const cData = await cRes.json();
      if (cData.success) setCertificates(cData.data);

      const stRes = await fetch("/api/settings");
      const stData = await stRes.json();
      if (stData.success) setSettings(stData.data);

    } catch (err) {
      console.error("Lỗi khi kết nối cơ sở dữ liệu Express:", err);
    } finally {
      setLoading(false);
    }
  };

  // FPS tracker state and effect
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let animationId: number;

    const tick = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Back to top scroll tracking state and effect
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Check persistent token session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("cyber_auth_token");
    if (storedToken) {
      setToken(storedToken);
      // Validate session against endpoint
      fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${storedToken}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem("cyber_auth_token");
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("cyber_auth_token");
          setToken(null);
        });
    }
    fetchAllData();
  }, []);

  // Login execution handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("cyber_auth_token", data.data.token);
        setToken(data.data.token);
        setIsLoggedIn(true);
        setIsAdminView(true);
        setUsername("");
        setPassword("");
      } else {
        setLoginError(data.message || "Đăng nhập thất bại.");
      }
    } catch (err) {
      setLoginError("Không thể kết nối máy chủ dữ liệu lúc này.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cyber_auth_token");
    setToken(null);
    setIsLoggedIn(false);
    setIsAdminView(false);
  };

  if (loading) {
    const avatarUrl = profile?.avatar || "https://files.catbox.moe/5f5zq9.jpg";
    return (
      <div className="fixed inset-0 bg-[#070312] flex flex-col items-center justify-center space-y-6">
        {/* Glowing circular avatar */}
        <div className="relative">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full blur opacity-75 animate-pulse"></div>
          <div className="relative w-24 h-24 rounded-full border-2 border-cyan-400 overflow-hidden bg-black/50">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Small loader badge overlay */}
          <div className="absolute -bottom-1 -right-1 bg-[#070312] border border-cyan-400 p-1.5 rounded-full shadow-lg">
            <Loader className="w-4 h-4 text-pink-500 animate-spin" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase font-semibold block">
            {profile?.name || "Khánh Duy"}...
          </span>
          <span className="font-mono text-[9px] text-gray-600 uppercase tracking-widest block animate-pulse">
            Đang tải hệ thống
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-gray-100 min-h-screen bg-transparent relative selection:bg-cyan-500 selection:text-slate-950">
      {/* Background elements */}
      <CyberBackground />

      {/* Top Navigation */}
      <Header
        isAdminView={isAdminView}
        onToggleAdminView={() => {
          if (isLoggedIn) {
            setIsAdminView(!isAdminView);
          } else {
            setIsAdminView(true); // show login form
          }
        }}
        siteTitle={settings.site_title}
        isLoggedIn={isLoggedIn}
        hasCertificates={certificates.length > 0}
        activeAdminTab={adminActiveTab}
        setActiveAdminTab={setAdminActiveTab}
        onLogout={handleLogout}
        musicLinksString={settings.music_links}
      />

      {/* Dynamic View rendering */}
      {isAdminView ? (
        isLoggedIn ? (
          <div className="lg:pl-64 xl:pl-72 w-full">
            <AdminDashboard
              onLogout={handleLogout}
              token={token}
              onRefreshData={fetchAllData}
              profile={profile}
              skills={skills}
              projects={projects}
              roadmaps={roadmaps}
              experiences={experiences}
              certificates={certificates}
              activeTab={adminActiveTab}
              setActiveTab={setAdminActiveTab}
            />
          </div>
        ) : (
          /* Secure login form panel */
          <div className="min-h-screen flex items-center justify-center px-4 relative z-10 font-sans lg:pl-64 xl:pl-72">
            <div className="relative max-w-sm w-full group">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg opacity-30 blur animate-pulse" />
              
              <div className="relative bg-[#0c0721]/95 border border-purple-500/30 p-6 sm:p-8 rounded-lg backdrop-blur-md">
                
                <div className="text-center space-y-2 mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 mb-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-bounce">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans font-black text-lg text-white uppercase tracking-tight">ADMIN CENTRAL PORTAL</h3>
                  <p className="font-mono text-[9px] text-gray-500 tracking-wider">SECURE_GATEWAY_v1.2</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tên tài khoản (Seed: admin)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none"
                      placeholder="Username"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-wider">Mật khẩu (Seed: admin)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none"
                      placeholder="Password"
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 rounded bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[11px] font-medium flex items-center space-x-1.5 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 font-mono text-xs font-bold uppercase tracking-wider bg-pink-500 hover:bg-pink-600 text-white rounded transition-colors duration-200 shadow-[0_0_15px_rgba(244,63,94,0.35)] cursor-pointer disabled:opacity-50"
                  >
                    {loginLoading ? "XÁC MINH DANH TÍNH..." : "ĐĂNG NHẬP // ENCRYPT"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminView(false)}
                    className="w-full py-2 font-mono text-[9px] font-bold text-gray-500 hover:text-white transition-colors duration-150 uppercase"
                  >
                    &lt; QUAY LẠI TRANG CHỦ
                  </button>
                </form>

              </div>
            </div>
          </div>
        )
      ) : (
        /* Standard Portfolio Sections */
        <div className="lg:pl-64 xl:pl-72">
          <Hero 
            profile={profile} 
            heroTitle={settings.hero_title}
            heroSubtitle={settings.hero_subtitle}
            statusActive={settings.status_active}
          />
          <About profile={profile} />
          <Skills skills={skills} />
          <RoadmapSection roadmaps={roadmaps} />
          <Projects projects={projects} />
          <ExperienceSection experiences={experiences} />
          {certificates.length > 0 && <Certificates certificates={certificates} />}
          <Contact profile={profile} />
          <Footer />
        </div>
      )}

      {/* Floating Action Utilities (FPS & Back to Top) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {/* Small FPS Indicator */}
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070d1d]/90 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-black tracking-wider shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>{fps} FPS</span>
        </div>

        {/* Back to Top Button */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="pointer-events-auto p-2 rounded-full bg-[#070d1d]/95 border border-pink-500/40 text-pink-500 hover:text-white hover:bg-pink-500 hover:border-pink-500 hover:scale-110 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95 transition-all duration-300 shadow-lg shadow-black/50 group"
            title="Quay lại đầu trang"
          >
            <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </button>
        )}
      </div>
    </div>
  );
}
