import React, { useState, useEffect } from "react";
import { 
  Lock, User, ShieldAlert, Key, Plus, Edit2, Trash2, Check, X, 
  Terminal, Search, Settings, Mail, RefreshCw, Layers, Award, 
  Calendar, Server, Link2, Upload, MessageSquare, ListTodo, AlertTriangle
} from "lucide-react";
import { UserProfile, Skill, Project, Roadmap, Experience, Certificate, ContactMessage, SiteSettings } from "../types";

interface AdminDashboardProps {
  onLogout: () => void;
  token: string | null;
  onRefreshData: () => void;
  profile: UserProfile | null;
  skills: Skill[];
  projects: Project[];
  roadmaps: Roadmap[];
  experiences: Experience[];
  certificates: Certificate[];
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export type AdminTab = "profile" | "skills" | "projects" | "roadmaps" | "experiences" | "certificates" | "messages" | "settings";

export default function AdminDashboard({ 
  onLogout, token, onRefreshData, profile, skills, projects, roadmaps, experiences, certificates,
  activeTab, setActiveTab
}: AdminDashboardProps) {
  
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  
  // Search / Filter / Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: "", nickname: "", email: "", address: "", bio: "", 
    avatar: "", socialGithub: "", socialLinkedin: "", socialTwitter: "", newPassword: ""
  });
  const [settingsForm, setSettingsForm] = useState<SiteSettings>({});

  // Dynamic Item Editor modal state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Notification indicator toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Reset editor state when tab changes
  useEffect(() => {
    setEditingItem(null);
    setIsAddingNew(false);
    setSearchQuery("");
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        nickname: profile.nickname || "",
        email: profile.email || "",
        address: profile.address || "",
        bio: profile.bio || "",
        avatar: profile.avatar || "",
        socialGithub: profile.socialGithub || "",
        socialLinkedin: profile.socialLinkedin || "",
        socialTwitter: profile.socialTwitter || "",
        newPassword: ""
      });
    }
  }, [profile]);

  // Fetch Admin exclusive resources (messages, site settings)
  const fetchMessagesAndSettings = async () => {
    if (!token) return;
    try {
      const msgRes = await fetch("/api/messages", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const msgData = await msgRes.json();
      if (msgData.success) setMessages(msgData.data);

      const setRes = await fetch("/api/settings");
      const setData = await setRes.json();
      if (setData.success) {
        setSiteSettings(setData.data);
        setSettingsForm(setData.data);
      }
    } catch (err) {
      showToast("error", "Lỗi tải dữ liệu quản trị.");
    }
  };

  useEffect(() => {
    fetchMessagesAndSettings();
  }, [token]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Profile update submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Cập nhật profile cá nhân thành công!");
        onRefreshData();
      } else {
        showToast("error", data.message);
      }
    } catch (err) {
      showToast("error", "Không thể cập nhật profile lúc này.");
    }
  };

  // Settings update submission
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Cập nhật site settings hệ thống thành công!");
        setSiteSettings(data.data);
        onRefreshData();
      } else {
        showToast("error", data.message);
      }
    } catch (err) {
      showToast("error", "Không thể cập nhật cài đặt lúc này.");
    }
  };

  // Toggle Read Message status
  const handleToggleMessageRead = async (id: string, currentRead: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${id}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ read: !currentRead })
      });
      const data = await res.json();
      if (data.success) {
        fetchMessagesAndSettings();
        showToast("success", "Đã chuyển trạng thái tin nhắn!");
      }
    } catch (err) {
      showToast("error", "Không phản hồi được trạng thái.");
    }
  };

  // General Delete handler
  const executeDeletion = async () => {
    if (!deleteTargetId || !token) return;
    let endpoint = "";
    switch (activeTab) {
      case "skills": endpoint = `/api/skills/${deleteTargetId}`; break;
      case "projects": endpoint = `/api/projects/${deleteTargetId}`; break;
      case "roadmaps": endpoint = `/api/roadmaps/${deleteTargetId}`; break;
      case "experiences": endpoint = `/api/experiences/${deleteTargetId}`; break;
      case "certificates": endpoint = `/api/certificates/${deleteTargetId}`; break;
      case "messages": endpoint = `/api/messages/${deleteTargetId}`; break;
    }

    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Đã xóa bản ghi thành công!");
        setDeleteTargetId(null);
        onRefreshData();
        fetchMessagesAndSettings();
      } else {
        showToast("error", data.message);
      }
    } catch (err) {
      showToast("error", "Lỗi trong quá trình xóa dữ liệu.");
    }
  };

  const compressImage = (base64Str: string, maxWidth = 1600, maxHeight = 1600, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  // Base64 file uploader wrapper helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64String = reader.result as string;
      try {
        if (file.size > 1 * 1024 * 1024) {
          base64String = await compressImage(base64String);
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ base64: base64String })
        });

        if (!res.ok) {
          if (res.status === 413) {
            showToast("error", "Dung lượng ảnh quá lớn, vượt quá giới hạn của server (4.5MB).");
            return;
          }
          let errorMsg = "Không thể tải ảnh lên.";
          try {
            const text = await res.text();
            try {
              const errJson = JSON.parse(text);
              errorMsg = errJson.message || errorMsg;
            } catch {
              errorMsg = text.substring(0, 100) || errorMsg;
            }
          } catch {}
          showToast("error", errorMsg);
          return;
        }

        let uploadData;
        try {
          uploadData = await res.json();
        } catch {
          showToast("error", "Phản hồi từ server không hợp lệ.");
          return;
        }

        if (uploadData.success) {
          if (editingItem) {
            setEditingItem((prev: any) => ({ ...prev, [targetField]: uploadData.data }));
          } else {
            // Check if profile uploader
            if (targetField === "avatar") {
              setProfileForm((prev) => ({ ...prev, avatar: uploadData.data }));
            }
          }
          showToast("success", "Đã tải ảnh lên máy chủ Neon!");
        } else {
          showToast("error", uploadData.message || "Tải ảnh thất bại.");
        }
      } catch (err: any) {
        showToast("error", `Không thể tải ảnh lên: ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  // CRUD Item Submission
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    let endpoint = "";
    let method = editingItem?.id ? "PUT" : "POST";
    
    switch (activeTab) {
      case "skills":
        endpoint = editingItem?.id ? `/api/skills/${editingItem.id}` : "/api/skills";
        break;
      case "projects":
        endpoint = editingItem?.id ? `/api/projects/${editingItem.id}` : "/api/projects";
        break;
      case "roadmaps":
        endpoint = editingItem?.id ? `/api/roadmaps/${editingItem.id}` : "/api/roadmaps";
        break;
      case "experiences":
        endpoint = editingItem?.id ? `/api/experiences/${editingItem.id}` : "/api/experiences";
        break;
      case "certificates":
        endpoint = editingItem?.id ? `/api/certificates/${editingItem.id}` : "/api/certificates";
        break;
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editingItem)
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Lưu bản ghi dữ liệu thành công!");
        setEditingItem(null);
        setIsAddingNew(false);
        onRefreshData();
      } else {
        showToast("error", data.message);
      }
    } catch (err) {
      showToast("error", "Lỗi kết nối cơ sở dữ liệu.");
    }
  };

  // Setup Add initial item states helper
  const triggerAddNew = () => {
    setIsAddingNew(true);
    switch (activeTab) {
      case "skills":
        setEditingItem({ name: "", category: "Frontend", level: 90, iconName: "Code2" });
        break;
      case "projects":
        setEditingItem({ title: "", description: "", thumbnail: "", gallery: [], githubUrl: "", demoUrl: "", techStack: [], category: "Fullstack" });
        break;
      case "roadmaps":
        setEditingItem({ title: "", description: "", status: "Learning", order: 1, date: "Q3 2026" });
        break;
      case "experiences":
        setEditingItem({ company: "", position: "", description: "", startDate: "2026-01", endDate: "", current: true });
        break;
      case "certificates":
        setEditingItem({ name: "", issuer: "", issueDate: "2026-01", credentialUrl: "", imageUrl: "" });
        break;
    }
  };

  // Get active list depending on selected tab
  const getActiveList = () => {
    switch (activeTab) {
      case "skills": return skills;
      case "projects": return projects;
      case "roadmaps": return roadmaps;
      case "experiences": return experiences;
      case "certificates": return certificates;
      case "messages": return messages;
      default: return [];
    }
  };

  const filteredList = getActiveList().filter((item: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    const fieldsToSearch = [
      item.name, item.title, item.company, item.position, 
      item.description, item.issuer, item.subject, item.email
    ];
    return fieldsToSearch.some(f => f && String(f).toLowerCase().includes(searchLower));
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const displayedItems = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="pt-24 pb-16 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
      
      {/* Toast Alert pop-up */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-slideUp ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-pink-500/10 border-pink-500/30 text-pink-400"
        }`}>
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0c0721] border border-pink-500/50 p-6 rounded-lg max-w-sm w-full space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
            <div className="flex items-center gap-2 text-pink-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">XÁC NHẬN XÓA</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa bản ghi này khỏi cơ sở dữ liệu Postgres Neon? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3 font-mono text-[10px] font-bold">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded"
              >
                HỦY
              </button>
              <button
                onClick={executeDeletion}
                className="px-4 py-2 bg-pink-500 text-white rounded"
              >
                ĐỒNG Ý XÓA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin UI Grid */}
      <div className="w-full space-y-6">
        
        {/* Main workspace frame card wrapper */}
        <div className="bg-[#0c0721]/90 border border-purple-500/20 p-6 sm:p-8 rounded-lg backdrop-blur-md">
          
          {/* Dynamic Title banner according to active tab */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-900/60 mb-6">
              <div>
                <h2 className="font-sans font-black text-2xl text-white uppercase tracking-tight">
                  {activeTab === "profile" && "CẬP NHẬT PROFILE CÁ NHÂN"}
                  {activeTab === "skills" && "QUẢN TRỊ KỸ NĂNG CÔNG NGHỆ"}
                  {activeTab === "projects" && "DANH MỤC DỰ ÁN TIÊU BIỂU"}
                  {activeTab === "roadmaps" && "CÀI ĐẶT LỘ TRÌNH PHÁT TRIỂN"}
                  {activeTab === "experiences" && "MỐC THỜI GIAN KINH NGHIỆM"}
                  {activeTab === "certificates" && "CHỨNG CHỈ &amp; HỌC VẤN"}
                  {activeTab === "messages" && "HÒM THƯ TIN NHẮN LIÊN HỆ"}
                  {activeTab === "settings" && "CÀI ĐẶT SITE CHUNG"}
                </h2>
                <p className="font-mono text-[10px] text-gray-500">
                  SECURE_SESSION_ACCESS // HOSTED_ON_NEON_POOLER
                </p>
              </div>

              {/* Add New Trigger button (If CRUD Tab) */}
              {["skills", "projects", "roadmaps", "experiences", "certificates"].includes(activeTab) && !editingItem && (
                <button
                  onClick={triggerAddNew}
                  className="flex items-center space-x-1.5 font-mono text-[10px] font-bold px-3 py-1.5 bg-cyan-400 text-black hover:bg-cyan-300 rounded cursor-pointer transition-colors duration-150 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>THÊM MỚI //</span>
                </button>
              )}
            </div>

            {/* TAB PROFILE EDITING FORM */}
            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Họ tên hiển thị</label>
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Bí danh (Nickname)</label>
                    <input type="text" value={profileForm.nickname} onChange={(e) => setProfileForm({...profileForm, nickname: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Địa chỉ Email</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thành phố cư trú</label>
                    <input type="text" value={profileForm.address} onChange={(e) => setProfileForm({...profileForm, address: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tiểu sử tóm tắt (Bio)</label>
                  <textarea rows={4} value={profileForm.bio} onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none resize-none" />
                </div>

                {/* Avatar uploader */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ảnh đại diện (Avatar URL)</label>
                    <input type="text" value={profileForm.avatar} onChange={(e) => setProfileForm({...profileForm, avatar: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hoặc Tải Ảnh Lên</label>
                    <div className="relative flex items-center justify-center border border-dashed border-gray-800 rounded bg-black/30 p-2 text-gray-400 hover:text-white hover:border-gray-700 transition-all duration-200 cursor-pointer">
                      <input type="file" onChange={(e) => handleFileUpload(e, "avatar")} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      <Upload className="w-4 h-4 mr-2" />
                      <span className="font-mono text-[10px] font-bold uppercase">BROWSE IMAGE FILE</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">GitHub Link</label>
                    <input type="text" value={profileForm.socialGithub} onChange={(e) => setProfileForm({...profileForm, socialGithub: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Facebook Link</label>
                    <input type="text" value={profileForm.socialLinkedin} onChange={(e) => setProfileForm({...profileForm, socialLinkedin: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">TikTok Link</label>
                    <input type="text" value={profileForm.socialTwitter} onChange={(e) => setProfileForm({...profileForm, socialTwitter: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                </div>

                {/* Password update helper */}
                <div className="border-t border-gray-900 pt-5 space-y-1.5">
                  <label className="font-mono text-[10px] text-pink-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Thay đổi mật khẩu quản trị (Nhập để đổi)
                  </label>
                  <input type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})} placeholder="Để trống nếu không đổi mật khẩu..." className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button type="submit" className="px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 rounded transition-colors duration-150">
                    LƯU HỒ SƠ QUẢN TRỊ
                  </button>
                </div>
              </form>
            )}

            {/* SECURE SYSTEM SETTINGS EDITING TAB */}
            {activeTab === "settings" && (
              <form onSubmit={handleUpdateSettings} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tiêu đề trang (site_title)</label>
                    <input type="text" value={settingsForm.site_title || ""} onChange={(e) => setSettingsForm({...settingsForm, site_title: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trạng thái làm việc (status_active)</label>
                    <input type="text" value={settingsForm.status_active || ""} onChange={(e) => setSettingsForm({...settingsForm, status_active: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mô tả SEO (site_description)</label>
                  <textarea rows={3} value={settingsForm.site_description || ""} onChange={(e) => setSettingsForm({...settingsForm, site_description: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tên hiển thị Hero (hero_title)</label>
                    <input type="text" value={settingsForm.hero_title || ""} onChange={(e) => setSettingsForm({...settingsForm, hero_title: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vị trí hiển thị Hero (hero_subtitle)</label>
                    <input type="text" value={settingsForm.hero_subtitle || ""} onChange={(e) => setSettingsForm({...settingsForm, hero_subtitle: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">Danh sách link nhạc phát ngẫu nhiên (Cách nhau bằng dấu phẩy ",")</label>
                  <textarea rows={4} value={settingsForm.music_links || ""} onChange={(e) => setSettingsForm({...settingsForm, music_links: e.target.value})} className="w-full px-4 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-xs text-white focus:outline-none resize-none font-mono" placeholder="Ví dụ: https://example.com/song1.mp3, https://example.com/song2.mp3" />
                  <span className="text-[9px] text-cyan-400/70 font-mono block">// Chấp nhận định dạng file âm thanh trực tiếp (mp3, ogg, wav...). Để trống để sử dụng danh sách nhạc lo-fi cyberpunk mặc định.</span>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button type="submit" className="px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 rounded transition-colors duration-150">
                    CẬP NHẬT CÀI ĐẶT
                  </button>
                </div>
              </form>
            )}

            {/* TAB INBOX MESSAGES VIEW PANEL */}
            {activeTab === "messages" && (
              <div className="space-y-5">
                {/* Search Inbox bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" placeholder="Tìm kiếm tin nhắn..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-black/60 border border-gray-800 rounded font-sans text-xs text-white focus:outline-none" />
                </div>

                <div className="space-y-4">
                  {displayedItems.length > 0 ? (
                    displayedItems.map((msg: ContactMessage) => (
                      <div key={msg.id} className={`p-5 rounded-lg border backdrop-blur-sm relative transition-all duration-300 ${
                        msg.read 
                          ? "bg-gray-950/20 border-gray-900 text-gray-400" 
                          : "bg-purple-500/5 border-purple-500/25 text-white"
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-sans font-bold text-sm text-white">{msg.name}</span>
                            <span className="font-mono text-[9px] text-gray-500 font-medium">({msg.email})</span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-500">{msg.createdAt.substring(0, 10)}</span>
                        </div>

                        <div className="space-y-1.5 pr-8">
                          <h4 className="font-sans font-extrabold text-sm uppercase text-gray-200">
                            Chủ đề: {msg.subject}
                          </h4>
                          <p className="font-sans text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                            {msg.message}
                          </p>
                        </div>

                        {/* Message Actions */}
                        <div className="absolute right-3 top-3 flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleMessageRead(msg.id, msg.read)}
                            className={`p-1.5 rounded transition-colors duration-150 cursor-pointer ${
                              msg.read 
                                ? "text-gray-500 hover:text-white hover:bg-gray-900" 
                                : "text-purple-400 hover:text-white hover:bg-purple-900/40"
                            }`}
                            title={msg.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(msg.id)}
                            className="p-1.5 text-gray-500 hover:text-pink-400 hover:bg-gray-900 rounded transition-colors duration-150 cursor-pointer"
                            title="Xóa tin nhắn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center border border-dashed border-gray-800 rounded">
                      <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                        // NO MESSAGES IN INBOX
                      </span>
                    </div>
                  )}
                </div>

                {/* Pagination lists */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 border border-gray-800 bg-gray-950 text-gray-400 disabled:opacity-30 rounded cursor-pointer">&lt;</button>
                    <span className="font-mono text-xs text-gray-400">PAGE {currentPage} OF {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 border border-gray-800 bg-gray-950 text-gray-400 disabled:opacity-30 rounded cursor-pointer">&gt;</button>
                  </div>
                )}
              </div>
            )}

            {/* DYNAMIC CRUD MANAGERS: SKILLS, PROJECTS, ROADMAPS, EXPERIENCES, CERTIFICATES */}
            {["skills", "projects", "roadmaps", "experiences", "certificates"].includes(activeTab) && (
              <div className="space-y-6">
                
                {/* Save Editor form when active editing item */}
                {editingItem ? (
                  <form onSubmit={handleSaveItem} className="space-y-5 bg-gray-950/40 p-5 rounded border border-gray-900 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                      <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                        {editingItem?.id ? `// HIỆU CHỈNH_ID: ${editingItem.id.substring(0, 8)}` : "// THÊM MỚI BẢN GHI"}
                      </span>
                      <button type="button" onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-white p-1 hover:bg-gray-900 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* FIELDS DYNAMIC RENDERING CORRESPONDING TO TABS */}
                    {activeTab === "skills" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tên kỹ năng</label>
                          <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Danh mục kỹ năng</label>
                          <select value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none">
                            {["Frontend", "Backend", "Database", "Cloud", "AI", "Tools"].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mức độ thành thạo (0 - 100%)</label>
                          <input type="number" min={0} max={100} value={editingItem.level} onChange={(e) => setEditingItem({...editingItem, level: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                        </div>
                      </div>
                    )}

                    {activeTab === "projects" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tiêu đề dự án</label>
                            <input type="text" value={editingItem.title} onChange={(e) => setEditingItem({...editingItem, title: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Danh mục hiển thị</label>
                            <input type="text" value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" placeholder="e.g. Fullstack, Web..." required />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mô tả dự án</label>
                          <textarea rows={3} value={editingItem.description} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none resize-none" required />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ảnh thu nhỏ (Thumbnail URL)</label>
                            <input type="text" value={editingItem.thumbnail} onChange={(e) => setEditingItem({...editingItem, thumbnail: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hoặc upload ảnh thumbnail</label>
                            <div className="relative flex items-center justify-center border border-dashed border-gray-800 rounded bg-black/30 p-2 text-gray-400 hover:text-white cursor-pointer">
                              <input type="file" onChange={(e) => handleFileUpload(e, "thumbnail")} className="absolute inset-0 opacity-0 cursor-pointer" />
                              <Upload className="w-4 h-4 mr-1.5" />
                              <span className="font-mono text-[9px] font-bold">CHOOSE IMAGE FILE</span>
                            </div>
                          </div>
                        </div>

                        {/* Tech stack array field input wrapper */}
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Công nghệ sử dụng (Cách nhau bởi dấu phẩy)</label>
                          <input type="text" value={editingItem.techStack ? editingItem.techStack.join(", ") : ""} onChange={(e) => setEditingItem({...editingItem, techStack: e.target.value.split(",").map(item => item.trim()).filter(Boolean)})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" placeholder="React, Node.js, Prisma" required />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">GitHub Repo URL</label>
                            <input type="text" value={editingItem.githubUrl || ""} onChange={(e) => setEditingItem({...editingItem, githubUrl: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Live Demo URL</label>
                            <input type="text" value={editingItem.demoUrl || ""} onChange={(e) => setEditingItem({...editingItem, demoUrl: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "roadmaps" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tiêu đề học tập</label>
                          <input type="text" value={editingItem.title} onChange={(e) => setEditingItem({...editingItem, title: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Thời gian dự kiến</label>
                          <input type="text" value={editingItem.date || ""} onChange={(e) => setEditingItem({...editingItem, date: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" placeholder="e.g. Q3 - Q4 2026" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Trạng thái lộ trình</label>
                          <select value={editingItem.status} onChange={(e) => setEditingItem({...editingItem, status: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none">
                            <option value="Completed">Completed</option>
                            <option value="Learning">Learning</option>
                            <option value="Future">Future</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Thứ tự hiển thị (Order)</label>
                          <input type="number" value={editingItem.order} onChange={(e) => setEditingItem({...editingItem, order: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none animate-none" required />
                        </div>
                        <div className="space-y-1.5 col-span-full">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mô tả lộ trình học tập</label>
                          <textarea rows={3} value={editingItem.description || ""} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none resize-none" />
                        </div>
                      </div>
                    )}

                    {activeTab === "experiences" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tên công ty</label>
                            <input type="text" value={editingItem.company} onChange={(e) => setEditingItem({...editingItem, company: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Vị trí đảm nhiệm</label>
                            <input type="text" value={editingItem.position} onChange={(e) => setEditingItem({...editingItem, position: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ngày bắt đầu</label>
                            <input type="text" value={editingItem.startDate} onChange={(e) => setEditingItem({...editingItem, startDate: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" placeholder="YYYY-MM" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ngày kết thúc</label>
                            <input type="text" value={editingItem.endDate || ""} onChange={(e) => setEditingItem({...editingItem, endDate: e.target.value, current: false})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" placeholder="YYYY-MM (Bỏ trống nếu hiện tại)" disabled={editingItem.current} />
                          </div>
                          <div className="space-y-1.5 flex items-center pt-6 pl-4">
                            <label className="flex items-center space-x-2 text-xs text-white font-mono uppercase cursor-pointer select-none">
                              <input type="checkbox" checked={editingItem.current} onChange={(e) => setEditingItem({...editingItem, current: e.target.checked, endDate: e.target.checked ? "" : ""})} className="rounded bg-black border-gray-800 cursor-pointer" />
                              <span>ĐANG LÀM VIỆC</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mô tả chi tiết công việc</label>
                          <textarea rows={4} value={editingItem.description} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none resize-none" required />
                        </div>
                      </div>
                    )}

                    {activeTab === "certificates" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tên chứng chỉ</label>
                            <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Đơn vị cấp</label>
                            <input type="text" value={editingItem.issuer} onChange={(e) => setEditingItem({...editingItem, issuer: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" required />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ngày cấp</label>
                            <input type="text" value={editingItem.issueDate} onChange={(e) => setEditingItem({...editingItem, issueDate: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" placeholder="YYYY-MM" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Link xác thực chứng chỉ</label>
                            <input type="text" value={editingItem.credentialUrl || ""} onChange={(e) => setEditingItem({...editingItem, credentialUrl: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ảnh minh họa (Image URL)</label>
                            <input type="text" value={editingItem.imageUrl || ""} onChange={(e) => setEditingItem({...editingItem, imageUrl: e.target.value})} className="w-full px-3 py-2 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hoặc upload ảnh chứng chỉ</label>
                            <div className="relative flex items-center justify-center border border-dashed border-gray-800 rounded bg-black/30 p-2 text-gray-400 hover:text-white cursor-pointer">
                              <input type="file" onChange={(e) => handleFileUpload(e, "imageUrl")} className="absolute inset-0 opacity-0 cursor-pointer" />
                              <Upload className="w-4 h-4 mr-1.5" />
                              <span className="font-mono text-[9px] font-bold">CHOOSE IMAGE FILE</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-end gap-3 font-mono text-[10px] font-bold">
                      <button type="button" onClick={() => { setEditingItem(null); setIsAddingNew(false); }} className="px-4 py-2 border border-gray-800 bg-gray-900 text-gray-400 hover:text-white rounded uppercase">Hủy</button>
                      <button type="submit" className="px-5 py-2.5 bg-cyan-400 text-black hover:bg-cyan-300 rounded uppercase">Lưu bản ghi //</button>
                    </div>
                  </form>
                ) : (
                  // DISPLAY LIST SECTION FOR THE CURRENT ACTIVE TAB
                  <div className="space-y-5">
                    
                    {/* Search and filter controls inside current list */}
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" placeholder={`Tìm kiếm trong danh mục...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-black/60 border border-gray-800 rounded text-xs text-white focus:outline-none" />
                    </div>

                    {/* Table-like responsive lists block */}
                    <div className="border border-gray-900 rounded-lg overflow-hidden bg-black/30">
                      <div className="divide-y divide-gray-900">
                        {displayedItems.length > 0 ? (
                          displayedItems.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-950/40 transition-colors duration-150">
                              <div className="space-y-1">
                                <span className="font-sans font-extrabold text-sm text-white">
                                  {item.name || item.title || `${item.company} - ${item.position}`}
                                </span>
                                <p className="font-mono text-[9px] text-gray-500">
                                  ID: {item.id} | {item.category || item.status || item.issueDate || item.startDate}
                                </p>
                              </div>

                              {/* CRUD Action controls buttons row */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingItem(item)}
                                  className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-500/10 rounded border border-cyan-500/20 transition-all duration-150 cursor-pointer"
                                  title="Chỉnh sửa bản ghi"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteTargetId(item.id)}
                                  className="p-1.5 text-pink-400 hover:text-white hover:bg-pink-500/10 rounded border border-pink-500/20 transition-all duration-150 cursor-pointer"
                                  title="Xóa bản ghi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                              // CURRENT LIST DIRECTORY EMPTY
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pagination control footer bar */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-6">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 border border-gray-800 bg-gray-950 text-gray-400 disabled:opacity-30 rounded cursor-pointer">&lt;</button>
                        <span className="font-mono text-xs text-gray-400 font-semibold">PAGE {currentPage} OF {totalPages}</span>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 border border-gray-800 bg-gray-950 text-gray-400 disabled:opacity-30 rounded cursor-pointer">&gt;</button>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

          </div>

      </div>
    </div>
  );
}
