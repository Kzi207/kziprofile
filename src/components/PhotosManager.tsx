import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, Trash2, Edit2, Search, Calendar, HardDrive, Filter, 
  ArrowUpDown, Check, X, Loader, Copy, ExternalLink, Download, 
  ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, Eye, Tag, Info, AlertTriangle,
  MoreVertical, Grid, List, Plus, File, Folder, Clock, Share2, HelpCircle, HardDrive as StorageIcon
} from "lucide-react";
import { Photo } from "../types";

interface PhotosManagerProps {
  token: string | null;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  description: string;
  tags: string;
  progress: number; // 0 to 100
  status: "staged" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export default function PhotosManager({ token }: PhotosManagerProps) {
  // Gallery states
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"all" | "upload" | "dashboard">("all");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Dashboard states
  const [dashboardStats, setDashboardStats] = useState({
    totalPhotos: 0,
    totalSize: 0,
    newestPhoto: null as Photo | null,
    cloudinaryUsage: { used: 0, limit: 0 }
  });

  // Query filters
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Uploader config states
  const [maxSizeLimit, setMaxSizeLimit] = useState(5); // In MB
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox states
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Edit modal states
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", tags: "" });

  // Delete modal states
  const [deletingPhoto, setDeletingPhoto] = useState<Photo | null>(null);

  // General loading & toast alerts
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  // Show Toast notification
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch dashboard stats
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDashboardStats(data.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải thông số dashboard:", err);
    }
  };

  // Fetch photos gallery
  const fetchPhotos = async () => {
    setLoadingGallery(true);
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery,
        format: formatFilter,
        date: dateFilter,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: "12"
      });
      
      const res = await fetch(`/api/photos?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPhotos(data.data.photos);
        setTotalPhotos(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        showToast("error", data.message || "Không thể tải danh sách ảnh.");
      }
    } catch (err) {
      showToast("error", "Lỗi kết nối cơ sở dữ liệu khi tải ảnh.");
    } finally {
      setLoadingGallery(false);
    }
  };

  // Trigger fetches on filter/page changes
  useEffect(() => {
    fetchPhotos();
  }, [currentPage, formatFilter, dateFilter, sortBy, sortOrder]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPhotos();
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchDashboardData();
  }, [photos, token]);

  // Utility to format bytes to human readable size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Uploader Handlers
  const processFiles = (files: FileList) => {
    const newStaged: StagedFile[] = [];
    const maxSizeBytes = maxSizeLimit * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validation format
      if (!allowedFormats.includes(file.type)) {
        showToast("error", `Định dạng ${file.name.split(".").pop()} không hỗ trợ!`);
        continue;
      }

      // Validation size
      if (file.size > maxSizeBytes) {
        showToast("error", `File ${file.name} vượt quá giới hạn ${maxSizeLimit}MB!`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      newStaged.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl,
        title: nameWithoutExtension.replace(/[-_]/g, " "),
        description: "",
        tags: "",
        progress: 0,
        status: "staged"
      });
    }

    if (newStaged.length > 0) {
      setStagedFiles(prev => [...prev, ...newStaged]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const updateStagedMetadata = (id: string, field: "title" | "description" | "tags", value: string) => {
    setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Convert File object to Base64 String helper
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Upload single photo flow
  const uploadSingleFile = async (staged: StagedFile) => {
    if (!token) return;
    
    // Update state to uploading
    setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, status: "uploading", progress: 20 } : f));

    try {
      const base64String = await convertFileToBase64(staged.file);
      setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, progress: 50 } : f));

      const tagsArray = staged.tags
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== "");

      const response = await fetch("/api/photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: staged.title,
          description: staged.description,
          tags: tagsArray,
          file: base64String
        })
      });

      const data = await response.json();
      if (data.success) {
        setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, status: "success", progress: 100 } : f));
        showToast("success", `Đã upload thành công: ${staged.title}`);
        
        // Refresh gallery
        fetchPhotos();
      } else {
        throw new Error(data.message || "Lỗi tải ảnh lên máy chủ.");
      }
    } catch (err: any) {
      console.error(err);
      setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, status: "error", progress: 0, errorMessage: err.message } : f));
      showToast("error", `Thất bại khi upload: ${staged.title}. ${err.message}`);
    }
  };

  const uploadAllStagedFiles = async () => {
    const filesToUpload = stagedFiles.filter(f => f.status === "staged" || f.status === "error");
    if (filesToUpload.length === 0) return;

    for (const staged of filesToUpload) {
      await uploadSingleFile(staged);
    }
  };

  const clearStagedFiles = () => {
    stagedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setStagedFiles([]);
  };

  // Actions
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("success", "Đã copy liên kết ảnh vào clipboard!");
  };

  const handleDownload = (url: string, filename: string) => {
    // Standard download trigger via link
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "Đang tải ảnh xuống...");
  };

  // Edit Photo Handlers
  const openEditModal = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditForm({
      title: photo.title,
      description: photo.description || "",
      tags: photo.tags.join(", ")
    });
  };

  const submitEditPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto || !token) return;

    try {
      const tagsArray = editForm.tags
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== "");

      const res = await fetch(`/api/photos/${editingPhoto.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          tags: tagsArray
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", "Cập nhật metadata ảnh thành công!");
        setEditingPhoto(null);
        fetchPhotos();
      } else {
        showToast("error", data.message || "Không thể cập nhật.");
      }
    } catch (err) {
      showToast("error", "Lỗi kết nối cơ sở dữ liệu khi sửa ảnh.");
    }
  };

  // Delete Photo Handlers
  const executeDeletePhoto = async () => {
    if (!deletingPhoto || !token) return;

    try {
      const res = await fetch(`/api/photos/${deletingPhoto.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Đã xóa ảnh thành công khỏi Neon & Cloudinary!");
        setDeletingPhoto(null);
        fetchPhotos();
      } else {
        showToast("error", data.message || "Xóa ảnh thất bại.");
      }
    } catch (err) {
      showToast("error", "Lỗi kết nối cơ sở dữ liệu khi xóa ảnh.");
    }
  };

  // Fullscreen support for lightbox
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      lightboxRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        showToast("error", "Không thể kích hoạt chế độ toàn màn hình.");
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#070314] text-gray-200 font-sans flex flex-col antialiased">
      
      {/* Toast alert */}
      {toast && (
        <div className={`fixed bottom-20 lg:bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-slideUp ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-pink-500/10 border-pink-500/30 text-pink-400"
        }`}>
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex flex-1 flex-col lg:flex-row relative">
        
        {/* LEFT SIDEBAR (Desktop only) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-purple-500/20 bg-[#070518]/90 p-5 sticky top-[70px] h-[calc(100vh-70px)]">
          <div className="space-y-6">
            {/* Create New upload button */}
            <button 
              onClick={() => setActiveTab("upload")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>TẢI LÊN MỚI</span>
            </button>

            {/* Sidebar navigation links */}
            <nav className="space-y-1 font-mono text-xs">
              <button 
                onClick={() => { setActiveTab("all"); setSelectedPhoto(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-200 cursor-pointer text-left ${
                  activeTab === "all" 
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]" 
                    : "text-gray-400 hover:text-white hover:bg-gray-900/40 border border-transparent"
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>Kho Lưu Trữ</span>
              </button>
              <button 
                onClick={() => setActiveTab("upload")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-200 cursor-pointer text-left ${
                  activeTab === "upload" 
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]" 
                    : "text-gray-400 hover:text-white hover:bg-gray-900/40 border border-transparent"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Center</span>
              </button>
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-200 cursor-pointer text-left ${
                  activeTab === "dashboard" 
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]" 
                    : "text-gray-400 hover:text-white hover:bg-gray-900/40 border border-transparent"
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Neon DB &amp; Quota</span>
              </button>
            </nav>
          </div>

          {/* Storage mini quota widget */}
          <div className="border-t border-gray-900/80 pt-5 space-y-2">
            <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-black block">Lưu trữ Cloudinary</span>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
              <span className="text-white">{formatBytes(dashboardStats.totalSize)}</span>
              <span className="text-gray-500">/ 10 MB</span>
            </div>
            <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-gray-800">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-pink-500 h-full rounded-full" 
                style={{ width: `${Math.min((dashboardStats.totalSize / (10 * 1024 * 1024)) * 100, 100)}%` }}
              />
            </div>
            <span className="font-mono text-[8px] text-cyan-400/70 block">// SYSTEM_QUOTA_USAGE</span>
          </div>
        </aside>

        {/* MAIN CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 space-y-6 overflow-x-hidden min-h-[calc(100vh-140px)] lg:min-h-0">
          
          {/* SEARCH BAR (Top of main area) */}
          <div className="bg-[#0b0621]/90 border border-purple-500/10 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70" />
              <input 
                type="text" 
                placeholder="Tìm kiếm trong Cyber Drive..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/50 border border-gray-800 focus:border-cyan-400 rounded-lg text-xs text-white focus:outline-none placeholder-gray-500 transition-all font-mono" 
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] font-bold">
              <button 
                onClick={() => { setFormatFilter(""); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  formatFilter === "" 
                    ? "bg-cyan-400 text-black border-cyan-400" 
                    : "bg-black/40 text-gray-400 border-gray-800 hover:text-white"
                }`}
              >
                TẤT CẢ
              </button>
              {["png", "jpg", "jpeg", "webp", "gif"].map((fmt) => (
                <button 
                  key={fmt}
                  onClick={() => { setFormatFilter(fmt); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full border transition-all uppercase cursor-pointer ${
                    formatFilter === fmt 
                      ? "bg-cyan-400 text-black border-cyan-400" 
                      : "bg-black/40 text-gray-400 border-gray-800 hover:text-white"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: ALL PHOTOS GALLERY */}
          {activeTab === "all" && (
            <div className="space-y-6">
              
              {/* Quick access row */}
              {photos.length > 0 && currentPage === 1 && searchQuery === "" && !formatFilter && !dateFilter && (
                <div className="space-y-3">
                  <h4 className="font-mono text-[9px] text-cyan-400 uppercase tracking-widest font-black flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>TRUY CẬP NHANH (MỚI NHẤT)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.slice(0, 4).map((photo, index) => (
                      <div 
                        key={`quick-${photo.id}`}
                        onClick={() => { setSelectedPhoto(photo); }}
                        className={`group bg-[#070d1d]/60 border rounded-lg p-2.5 cursor-pointer transition-all duration-200 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] flex flex-col justify-between h-36 ${
                          selectedPhoto?.id === photo.id ? "border-cyan-400 bg-cyan-950/5" : "border-purple-500/10 hover:border-cyan-500/30"
                        }`}
                      >
                        <div className="relative flex-1 rounded overflow-hidden bg-black/40 border border-gray-900/60 mb-2">
                          <img src={photo.secureUrl} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                              className="p-1 bg-black/80 hover:bg-cyan-500/20 text-cyan-400 hover:text-white rounded border border-cyan-500/20 cursor-pointer"
                              title="Phóng to"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between min-w-0">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-white block truncate">{photo.title}</span>
                            <span className="text-[8px] text-gray-500 font-mono">{formatBytes(photo.bytes)}</span>
                          </div>
                          <div className="relative">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === `quick-${photo.id}` ? null : `quick-${photo.id}`); }}
                              className="p-1 text-gray-400 hover:text-white cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {/* Dropdown Menu for quick access */}
                            {activeMenuId === `quick-${photo.id}` && (
                              <>
                                <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                                <div className="absolute right-0 bottom-full mb-1 bg-[#0c0721]/95 border border-cyan-500/30 rounded-md shadow-2xl py-1 w-44 z-50 font-mono text-[9px] text-gray-300 divide-y divide-gray-900/60 text-left">
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setLightboxIndex(index); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                    <Eye className="w-3.5 h-3.5 text-cyan-400" /> PHÓNG TO
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedPhoto(photo); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                    <Info className="w-3.5 h-3.5 text-cyan-400" /> CHI TIẾT TỆP
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openEditModal(photo); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> ĐỔI TÊN / SỬA
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleCopyLink(photo.secureUrl); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                    <Copy className="w-3.5 h-3.5 text-cyan-400" /> SAO CHÉP LINK
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDownload(photo.secureUrl, photo.title); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                    <Download className="w-3.5 h-3.5 text-cyan-400" /> TẢI XUỐNG
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setDeletingPhoto(photo); }} className="w-full text-left px-3 py-2 hover:bg-pink-500/20 hover:text-pink-400 flex items-center gap-2 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5 text-pink-500" /> XÓA TỆP TIN
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main files display area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-900/60 pb-3">
                  <h4 className="font-mono text-[9px] text-gray-400 uppercase tracking-widest font-black">TỆP TIN ({totalPhotos})</h4>
                  
                  <div className="flex items-center gap-4">
                    {/* View mode toggle buttons */}
                    <div className="flex items-center bg-black/40 border border-gray-800 rounded-lg p-0.5">
                      <button 
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20" : "text-gray-500 hover:text-gray-300"}`}
                        title="Dạng lưới"
                      >
                        <Grid className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "list" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20" : "text-gray-500 hover:text-gray-300"}`}
                        title="Dạng danh sách"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sort Options dropdown */}
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                      <select 
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                        className="bg-black/60 border border-gray-800 text-[10px] text-white px-2 py-1 focus:outline-none focus:border-cyan-400 rounded font-mono"
                      >
                        <option value="createdAt">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="title">Tên tệp</option>
                        <option value="size">Dung lượng</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loadingGallery ? (
                  <div className="py-24 text-center">
                    <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
                    <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                      Đang truy hồi dữ liệu từ Neon DB...
                    </span>
                  </div>
                ) : photos.length > 0 ? (
                  viewMode === "grid" ? (
                    /* GRID VIEW (Mobile: 2 columns, Desktop: 3-4 columns) */
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo, index) => (
                        <div 
                          key={photo.id}
                          onClick={() => { setSelectedPhoto(photo); }}
                          className={`group relative overflow-hidden bg-[#070d1d]/70 border rounded-lg backdrop-blur-xs transition-all duration-300 hover:border-cyan-500/35 hover:shadow-[0_0_12px_rgba(34,211,238,0.1)] flex flex-col justify-between ${
                            selectedPhoto?.id === photo.id ? "border-cyan-400 bg-cyan-950/5" : "border-purple-500/10"
                          }`}
                        >
                          {/* Card Thumbnail Area */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                            className="relative aspect-video w-full overflow-hidden bg-black/40 border-b border-gray-900/60 cursor-pointer"
                          >
                            <img src={photo.secureUrl} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                            {/* Glassmorphic hover overlay */}
                            <div className="absolute inset-0 bg-[#070312]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                              <span className="font-mono text-[7px] text-gray-400 self-start">
                                {photo.width}x{photo.height} ({photo.format.toUpperCase()})
                              </span>
                              <p className="text-[9px] text-gray-300 line-clamp-2 leading-relaxed">
                                {photo.description || "Không có mô tả..."}
                              </p>
                              <div className="flex justify-end">
                                <span className="p-1 bg-black/60 rounded text-cyan-400 border border-cyan-400/20">
                                  <Eye className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer Info Row */}
                          <div className="p-2.5 flex items-center justify-between gap-1.5 min-w-0">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white block truncate" title={photo.title}>{photo.title}</span>
                              <span className="text-[8px] font-mono text-gray-500 block truncate">{photo.createdAt.substring(0, 10)} • {formatBytes(photo.bytes)}</span>
                            </div>
                            
                            {/* Actions Dropdown Trigger */}
                            <div className="relative shrink-0">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === photo.id ? null : photo.id); }}
                                className="p-1 hover:bg-black/60 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuId === photo.id && (
                                <>
                                  <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                                  <div className="absolute right-0 bottom-full mb-1 bg-[#0c0721]/95 border border-cyan-500/35 rounded-md shadow-2xl py-1 w-44 z-50 font-mono text-[9px] text-gray-300 divide-y divide-gray-900/60 text-left">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setLightboxIndex(index); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> PHÓNG TO
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedPhoto(photo); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                      <Info className="w-3.5 h-3.5 text-cyan-400" /> CHI TIẾT TỆP
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openEditModal(photo); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                      <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> ĐỔI TÊN / SỬA
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleCopyLink(photo.secureUrl); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                      <Copy className="w-3.5 h-3.5 text-cyan-400" /> SAO CHÉP LINK
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDownload(photo.secureUrl, photo.title); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                      <Download className="w-3.5 h-3.5 text-cyan-400" /> TẢI XUỐNG
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setDeletingPhoto(photo); }} className="w-full text-left px-3 py-2 hover:bg-pink-500/20 hover:text-pink-400 flex items-center gap-2 cursor-pointer">
                                      <Trash2 className="w-3.5 h-3.5 text-pink-500" /> XÓA TỆP TIN
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* LIST VIEW (Sleek modern Google Drive table) */
                    <div className="overflow-x-auto w-full bg-[#070d1d]/40 border border-purple-500/10 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-purple-500/20 bg-black/40 text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                            <th className="p-3 pl-4">Tên tệp tin</th>
                            <th className="p-3 hidden sm:table-cell">Ngày tải lên</th>
                            <th className="p-3 hidden md:table-cell">Kích thước</th>
                            <th className="p-3 hidden md:table-cell">Định dạng</th>
                            <th className="p-3 text-right pr-4">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/10">
                          {photos.map((photo, index) => (
                            <tr 
                              key={photo.id}
                              onClick={() => { setSelectedPhoto(photo); }}
                              className={`hover:bg-cyan-500/5 transition-colors cursor-pointer ${
                                selectedPhoto?.id === photo.id ? "bg-cyan-500/10 border-l-2 border-cyan-400" : ""
                              }`}
                            >
                              <td className="p-3 pl-4 flex items-center gap-3 min-w-[200px]">
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                                  className="w-10 h-10 rounded bg-black/40 overflow-hidden border border-gray-800 shrink-0 cursor-pointer"
                                >
                                  <img src={photo.secureUrl} alt={photo.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-white block truncate">{photo.title}</span>
                                  <span className="text-[9px] text-gray-500 font-mono sm:hidden">{photo.createdAt.substring(0, 10)} • {formatBytes(photo.bytes)}</span>
                                </div>
                              </td>
                              <td className="p-3 hidden sm:table-cell font-mono text-gray-400">{photo.createdAt.substring(0, 10)}</td>
                              <td className="p-3 hidden md:table-cell font-mono text-gray-400">{formatBytes(photo.bytes)}</td>
                              <td className="p-3 hidden md:table-cell font-mono text-cyan-400 uppercase">{photo.format}</td>
                              <td className="p-3 text-right pr-4 relative">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === photo.id ? null : photo.id); }}
                                  className="p-1 text-gray-400 hover:text-white hover:bg-black/40 rounded transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {activeMenuId === photo.id && (
                                  <>
                                    <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                                    <div className="absolute right-2 top-8 bg-[#0c0721]/95 border border-cyan-500/35 rounded-md shadow-2xl py-1 w-44 z-50 font-mono text-[9px] text-gray-300 divide-y divide-gray-900/60 text-left">
                                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setLightboxIndex(index); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                        <Eye className="w-3.5 h-3.5 text-cyan-400" /> PHÓNG TO
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedPhoto(photo); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                        <Info className="w-3.5 h-3.5 text-cyan-400" /> CHI TIẾT TỆP
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openEditModal(photo); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> ĐỔI TÊN / SỬA
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleCopyLink(photo.secureUrl); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                        <Copy className="w-3.5 h-3.5 text-cyan-400" /> SAO CHÉP LINK
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDownload(photo.secureUrl, photo.title); }} className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-white flex items-center gap-2 cursor-pointer">
                                        <Download className="w-3.5 h-3.5 text-cyan-400" /> TẢI XUỐNG
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setDeletingPhoto(photo); }} className="w-full text-left px-3 py-2 hover:bg-pink-500/20 hover:text-pink-400 flex items-center gap-2 cursor-pointer">
                                        <Trash2 className="w-3.5 h-3.5 text-pink-500" /> XÓA TỆP TIN
                                      </button>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="py-24 text-center border border-dashed border-gray-900 rounded-lg bg-black/10">
                    <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                      // KHÔNG CÓ BẢN GHI ẢNH NÀO TRONG HỆ THỐNG
                    </span>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1} 
                      className="p-1.5 border border-gray-800 bg-gray-950 text-gray-400 disabled:opacity-30 rounded cursor-pointer transition-opacity"
                    >
                      &lt;
                    </button>
                    <span className="font-mono text-[10px] text-gray-400 font-semibold">TRANG {currentPage} TRÊN {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages} 
                      className="p-1.5 border border-gray-800 bg-gray-950 text-gray-400 disabled:opacity-30 rounded cursor-pointer transition-opacity"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD CENTER */}
          {activeTab === "upload" && (
            <div className="bg-[#0c0721]/90 border border-purple-500/20 p-5 sm:p-6 rounded-lg backdrop-blur-md">
              <h3 className="font-sans font-black text-base text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>PHÂN HỆ TẢI ẢNH LÊN CLOUDINARY</span>
              </h3>

              {/* Configurations */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-900/60">
                <div className="flex items-center gap-3">
                  <label className="font-mono text-[10px] text-gray-400 uppercase font-bold tracking-wider">Giới hạn dung lượng:</label>
                  <select 
                    value={maxSizeLimit} 
                    onChange={(e) => setMaxSizeLimit(parseInt(e.target.value))}
                    className="bg-black/60 border border-gray-800 text-xs text-white px-2 py-1 focus:outline-none focus:border-cyan-400 rounded font-mono"
                  >
                    <option value={2}>2 MB</option>
                    <option value={5}>5 MB</option>
                    <option value={10}>10 MB</option>
                    <option value={20}>20 MB</option>
                  </select>
                </div>
                <div className="text-[10px] font-mono text-gray-500 uppercase">
                  Hỗ trợ: JPG, JPEG, PNG, WEBP, GIF
                </div>
              </div>

              {/* Drag & Drop Target */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                  isDragging 
                    ? "border-cyan-400 bg-cyan-500/5 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
                    : "border-purple-500/25 bg-black/20 hover:border-cyan-500/40 hover:bg-cyan-500/2"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  multiple 
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden" 
                />
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.15)] group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 animate-pulse" />
                </div>
                <p className="font-sans font-bold text-xs uppercase tracking-wider text-white text-center">
                  Kéo thả ảnh vào đây hoặc nhấp để chọn
                </p>
                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest text-center mt-1">
                  Drag &amp; Drop or Browse image files
                </p>
              </div>

              {/* Staged files list */}
              {stagedFiles.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <span className="font-mono text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                      DANH SÁCH ẢNH CHỜ UPLOAD ({stagedFiles.length})
                    </span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={clearStagedFiles}
                        className="font-mono text-[9px] font-bold text-gray-500 hover:text-white px-2 py-1 uppercase cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                      <button 
                        onClick={uploadAllStagedFiles}
                        className="font-mono text-[10px] font-bold bg-cyan-400 text-black hover:bg-cyan-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        UPLOAD TẤT CẢ //
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                    {stagedFiles.map((staged) => (
                      <div 
                        key={staged.id}
                        className={`p-4 bg-[#070d1d]/90 border rounded-lg backdrop-blur-md relative transition-all duration-300 ${
                          staged.status === "success" 
                            ? "border-emerald-500/30 bg-emerald-500/2" 
                            : staged.status === "error" 
                            ? "border-pink-500/30 bg-pink-500/2" 
                            : "border-gray-800"
                        }`}
                      >
                        {/* Remove button */}
                        {staged.status !== "uploading" && (
                          <button 
                            onClick={() => removeStagedFile(staged.id)}
                            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white hover:bg-gray-900 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="flex gap-4">
                          {/* Preview Image */}
                          <div className="w-20 h-20 rounded border border-gray-800 bg-black/40 overflow-hidden shrink-0 relative">
                            <img src={staged.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            {staged.status === "uploading" && (
                              <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                                <Loader className="w-5 h-5 text-cyan-400 animate-spin" />
                              </div>
                            )}
                            {staged.status === "success" && (
                              <div className="absolute inset-0 bg-emerald-950/75 flex items-center justify-center text-emerald-400">
                                <Check className="w-5 h-5" />
                              </div>
                            )}
                            {staged.status === "error" && (
                              <div className="absolute inset-0 bg-pink-950/75 flex items-center justify-center text-pink-400">
                                <X className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          {/* Metadata fields */}
                          <div className="flex-1 min-w-0 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[9px] text-gray-500 truncate uppercase">
                                {staged.file.name} ({formatBytes(staged.file.size)})
                              </span>
                            </div>

                            <div className="space-y-1">
                              <label className="font-mono text-[8px] text-gray-400 uppercase font-bold tracking-wider">Tiêu đề ảnh</label>
                              <input 
                                type="text" 
                                value={staged.title} 
                                disabled={staged.status === "uploading" || staged.status === "success"}
                                onChange={(e) => updateStagedMetadata(staged.id, "title", e.target.value)}
                                className="w-full px-2.5 py-1 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-400 rounded" 
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-mono text-[8px] text-gray-400 uppercase font-bold tracking-wider">Mô tả ảnh</label>
                              <input 
                                type="text" 
                                value={staged.description} 
                                disabled={staged.status === "uploading" || staged.status === "success"}
                                onChange={(e) => updateStagedMetadata(staged.id, "description", e.target.value)}
                                className="w-full px-2.5 py-1 bg-black/60 border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-400 rounded" 
                              />
                            </div>

                            {/* Error details */}
                            {staged.status === "error" && staged.errorMessage && (
                              <p className="text-[9px] font-medium text-pink-400 block animate-pulse">
                                * Lỗi: {staged.errorMessage}
                              </p>
                            )}

                            {/* Progress bar */}
                            {(staged.status === "uploading" || staged.progress > 0) && (
                              <div className="space-y-1 pt-1">
                                <div className="w-full bg-black rounded-full h-1 overflow-hidden">
                                  <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${staged.progress}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions for single file */}
                        {staged.status !== "uploading" && staged.status !== "success" && (
                          <div className="mt-3 flex justify-end font-mono text-[8px] font-bold">
                            <button 
                              onClick={() => uploadSingleFile(staged)}
                              className="px-2.5 py-1 bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black rounded transition-all cursor-pointer"
                            >
                              UPLOAD PHẦN NÀY //
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STORAGE DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div className="relative group overflow-hidden bg-[#070d1d]/80 border border-purple-500/20 p-5 rounded-lg backdrop-blur-md">
                  <div className="absolute top-0 right-0 p-3 opacity-15 text-cyan-400">
                    <Folder className="w-12 h-12" />
                  </div>
                  <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-black block">TỔNG SỐ TỆP</span>
                  <span className="text-3xl font-black text-white mt-2 block font-sans tracking-tight">
                    {dashboardStats.totalPhotos}
                  </span>
                  <span className="font-mono text-[8px] text-cyan-400 mt-2 block">// NEON_DB_RECORDS</span>
                </div>

                <div className="relative group overflow-hidden bg-[#070d1d]/80 border border-purple-500/20 p-5 rounded-lg backdrop-blur-md">
                  <div className="absolute top-0 right-0 p-3 opacity-15 text-cyan-400">
                    <HardDrive className="w-12 h-12" />
                  </div>
                  <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-black block">DUNG LƯỢNG KHO ẢNH</span>
                  <span className="text-3xl font-black text-white mt-2 block font-sans tracking-tight">
                    {formatBytes(dashboardStats.totalSize)}
                  </span>
                  <span className="font-mono text-[8px] text-cyan-400 mt-2 block">// PHYSICAL_BYTES_SUM</span>
                </div>

                <div className="relative group overflow-hidden bg-[#070d1d]/80 border border-purple-500/20 p-5 rounded-lg backdrop-blur-md">
                  <div className="absolute top-0 right-0 p-3 opacity-15 text-cyan-400">
                    <HardDrive className="w-12 h-12" />
                  </div>
                  <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-black block">BĂNG THÔNG CLOUDINARY</span>
                  {dashboardStats.cloudinaryUsage && dashboardStats.cloudinaryUsage.limit > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-white">{formatBytes(dashboardStats.cloudinaryUsage.used)}</span>
                        <span className="text-gray-500">/ {formatBytes(dashboardStats.cloudinaryUsage.limit)}</span>
                      </div>
                      <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-gray-800">
                        <div 
                          className="bg-gradient-to-r from-cyan-400 to-pink-500 h-full rounded-full" 
                          style={{ width: `${Math.min((dashboardStats.cloudinaryUsage.used / dashboardStats.cloudinaryUsage.limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs font-mono text-gray-500">
                      // CLOUDINARY_API_FREE_QUOTA
                    </div>
                  )}
                </div>
              </div>

              {/* Server info / Details */}
              <div className="bg-[#0c0721]/90 border border-purple-500/20 p-5 sm:p-6 rounded-lg backdrop-blur-md font-mono text-[11px] text-gray-300 space-y-4">
                <h4 className="font-sans font-black text-sm text-white uppercase tracking-tight">// THÔNG TIN KHO LƯU TRỮ VÀ DỮ LIỆU</h4>
                <div className="divide-y divide-gray-900">
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-gray-500">Database Engine:</span>
                    <span className="text-white font-bold">Postgres Neon (Serverless)</span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-gray-500">Asset Cloud:</span>
                    <span className="text-white font-bold">Cloudinary CDN (Image storage)</span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-gray-500">Upload Path:</span>
                    <span className="text-cyan-400">/api/photos (Secure API Proxy)</span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-gray-500">Kích thước file tối đa cho phép:</span>
                    <span className="text-pink-400 font-bold">{maxSizeLimit} MB / tệp</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* DETAILS DRAWER FOR MOBILE (fixed bottom drawer) / DESKTOP (sticky sidebar) */}
        {selectedPhoto && (
          <>
            {/* Desktop persistent details sidebar */}
            <aside className="hidden lg:flex w-80 shrink-0 bg-[#07051a]/95 border-l border-purple-500/20 p-5 flex-col justify-between sticky top-[70px] h-[calc(100vh-70px)] overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                  <span className="font-mono text-[9px] text-cyan-400 font-black uppercase tracking-widest">// CHI TIẾT TỆP TIN</span>
                  <button onClick={() => setSelectedPhoto(null)} className="text-gray-500 hover:text-white p-1 hover:bg-gray-900 rounded cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="aspect-video w-full rounded overflow-hidden border border-gray-900/60 bg-black/40">
                  <img src={selectedPhoto.secureUrl} alt={selectedPhoto.title} className="w-full h-full object-contain" />
                </div>

                <div className="space-y-3.5 font-mono text-[10px]">
                  <div className="space-y-1">
                    <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Tên tệp tin</span>
                    <span className="text-white font-sans text-xs font-bold block break-all">{selectedPhoto.title}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Mô tả</span>
                    <span className="text-gray-300 font-sans block leading-relaxed max-h-24 overflow-y-auto">{selectedPhoto.description || "(Chưa có mô tả)"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5 border-t border-gray-900/60 pt-3">
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Kích thước</span>
                      <span className="text-white block">{formatBytes(selectedPhoto.bytes)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Định dạng</span>
                      <span className="text-cyan-400 block uppercase">{selectedPhoto.format}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Độ phân giải</span>
                      <span className="text-white block">{selectedPhoto.width} × {selectedPhoto.height} px</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Ngày tải</span>
                      <span className="text-white block">{selectedPhoto.createdAt.substring(0, 10)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-900/80 mt-5 flex flex-wrap gap-2 justify-end font-mono text-[8px] font-bold">
                <button 
                  onClick={() => handleCopyLink(selectedPhoto.secureUrl)}
                  className="px-2 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-400 hover:text-black rounded transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> SAO CHÉP LINK
                </button>
                <button 
                  onClick={() => handleDownload(selectedPhoto.secureUrl, selectedPhoto.title)}
                  className="px-2 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-white rounded transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> TẢI XUỐNG
                </button>
                <button 
                  onClick={() => openEditModal(selectedPhoto)}
                  className="px-2 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500 hover:text-white rounded transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> ĐỔI TÊN
                </button>
                <button 
                  onClick={() => setDeletingPhoto(selectedPhoto)}
                  className="px-2 py-1.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500 hover:text-white rounded transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> XÓA TỆP
                </button>
              </div>
            </aside>

            {/* Mobile Bottom Sheet details drawer */}
            <div className="lg:hidden fixed inset-0 bg-black/60 z-[110] backdrop-blur-xs" onClick={() => setSelectedPhoto(null)} />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0c0721] border-t border-purple-500/30 rounded-t-2xl z-[120] max-h-[80vh] overflow-y-auto shadow-[0_-8px_30px_rgba(0,0,0,0.8)] p-5 space-y-4 animate-slideUp">
              <div className="flex items-center justify-between border-b border-gray-900 pb-2.5">
                <span className="font-mono text-[9px] text-cyan-400 font-black uppercase tracking-widest">// CHI TIẾT TỆP TIN</span>
                <button onClick={() => setSelectedPhoto(null)} className="text-gray-500 hover:text-white p-1 hover:bg-gray-900 rounded cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video w-full rounded overflow-hidden border border-gray-900/60 bg-black/40">
                <img src={selectedPhoto.secureUrl} alt={selectedPhoto.title} className="w-full h-full object-contain" />
              </div>

              <div className="space-y-3 font-mono text-[10px]">
                <div className="space-y-1">
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Tên tệp tin</span>
                  <span className="text-white font-sans text-xs font-bold block break-all">{selectedPhoto.title}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider block">Mô tả</span>
                  <span className="text-gray-300 font-sans block leading-relaxed">{selectedPhoto.description || "(Chưa có mô tả)"}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-900/60 pt-3">
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block">Kích thước</span>
                    <span className="text-white block">{formatBytes(selectedPhoto.bytes)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block">Định dạng</span>
                    <span className="text-cyan-400 block uppercase">{selectedPhoto.format}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block">Độ phân giải</span>
                    <span className="text-white block">{selectedPhoto.width} × {selectedPhoto.height} px</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block">Ngày tải</span>
                    <span className="text-white block">{selectedPhoto.createdAt.substring(0, 10)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-900/80 font-mono text-[8px] font-bold">
                <button 
                  onClick={() => handleCopyLink(selectedPhoto.secureUrl)}
                  className="py-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-400 hover:text-black rounded text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> COPY LINK
                </button>
                <button 
                  onClick={() => handleDownload(selectedPhoto.secureUrl, selectedPhoto.title)}
                  className="py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-white rounded text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> TẢI XUỐNG
                </button>
                <button 
                  onClick={() => { setSelectedPhoto(null); openEditModal(selectedPhoto); }}
                  className="py-2.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500 hover:text-white rounded text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> ĐỔI TÊN
                </button>
                <button 
                  onClick={() => { setSelectedPhoto(null); setDeletingPhoto(selectedPhoto); }}
                  className="py-2.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500 hover:text-white rounded text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> XÓA TỆP
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#070518]/95 border-t border-purple-500/20 z-[100] backdrop-blur-md px-6 py-2 flex items-center justify-around">
        <button 
          onClick={() => { setActiveTab("all"); setSelectedPhoto(null); }}
          className={`flex flex-col items-center gap-1.5 py-1 cursor-pointer ${activeTab === "all" ? "text-cyan-400" : "text-gray-500"}`}
        >
          <Folder className="w-5 h-5" />
          <span className="font-mono text-[8px] uppercase tracking-wider font-bold">Kho Ảnh</span>
        </button>
        
        {/* Floating Upload Trigger in Center of bottom navigation */}
        <button 
          onClick={() => setActiveTab("upload")}
          className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] transform active:scale-95 transition-all border border-cyan-400/30 cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button 
          onClick={() => { setActiveTab("dashboard"); setSelectedPhoto(null); }}
          className={`flex flex-col items-center gap-1.5 py-1 cursor-pointer ${activeTab === "dashboard" ? "text-cyan-400" : "text-gray-500"}`}
        >
          <HardDrive className="w-5 h-5" />
          <span className="font-mono text-[8px] uppercase tracking-wider font-bold">Bộ nhớ</span>
        </button>
      </div>

      {/* --- EDIT METADATA MODAL --- */}
      {editingPhoto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <form 
            onSubmit={submitEditPhoto}
            className="bg-[#0c0721] border border-cyan-500/40 p-6 rounded-lg max-w-md w-full space-y-4 shadow-[0_0_45px_rgba(34,211,238,0.25)] animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <span className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-widest">
                // HIỆU CHỈNH THÔNG TIN ẢNH
              </span>
              <button 
                type="button" 
                onClick={() => setEditingPhoto(null)}
                className="text-gray-500 hover:text-white p-1 hover:bg-gray-900 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] text-gray-400 uppercase font-bold tracking-wider">Tiêu đề ảnh</label>
                <input 
                  type="text" 
                  value={editForm.title} 
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-white focus:outline-none"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[9px] text-gray-400 uppercase font-bold tracking-wider">Mô tả ảnh</label>
                <textarea 
                  rows={3}
                  value={editForm.description} 
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded text-white focus:outline-none resize-none" 
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 font-mono text-[10px] font-bold border-t border-gray-900 pt-3">
              <button 
                type="button" 
                onClick={() => setEditingPhoto(null)}
                className="px-4 py-2 border border-gray-800 bg-gray-900 text-gray-400 hover:text-white rounded uppercase cursor-pointer"
              >
                HỦY
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-cyan-400 text-black hover:bg-cyan-300 rounded uppercase cursor-pointer"
              >
                LƯU THAY ĐỔI
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {deletingPhoto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0c0721] border border-pink-500/50 p-6 rounded-lg max-w-sm w-full space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
            <div className="flex items-center gap-2 text-pink-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">XÁC NHẬN XÓA ẢNH</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa ảnh <span className="text-white font-bold">"${deletingPhoto.title}"</span>? 
              Bản ghi sẽ bị xóa vĩnh viễn khỏi máy chủ Postgres Neon và Cloudinary storage.
            </p>
            <div className="flex items-center justify-end gap-3 font-mono text-[10px] font-bold">
              <button 
                onClick={() => setDeletingPhoto(null)}
                className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded cursor-pointer"
              >
                HỦY
              </button>
              <button 
                onClick={executeDeletePhoto}
                className="px-4 py-2 bg-pink-500 text-white rounded cursor-pointer"
              >
                ĐỒNG Ý XÓA VĨNH VIỄN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX OVERLAY VIEW --- */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div 
          ref={lightboxRef}
          className="fixed inset-0 z-[150] bg-black/95 flex flex-col justify-between"
        >
          {/* Top actions bar */}
          <div className="bg-black/40 backdrop-blur-xs p-4 flex items-center justify-between text-gray-400 font-mono text-xs z-10 border-b border-gray-900/60">
            <div className="truncate pr-4">
              <span className="text-white font-bold">${photos[lightboxIndex].title}</span>
              <span className="hidden sm:inline text-gray-500"> | ${photos[lightboxIndex].width}x${photos[lightboxIndex].height}px (${formatBytes(photos[lightboxIndex].bytes)})</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Zoom controls */}
              <button 
                onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} 
                className="hover:text-white p-1 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] w-12 text-center">${Math.round(zoomLevel * 100)}%</span>
              <button 
                onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))} 
                className="hover:text-white p-1 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button 
                onClick={toggleFullscreen}
                className="hover:text-white p-1 cursor-pointer"
                title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
              >
                <Maximize className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => { setLightboxIndex(null); setZoomLevel(1); }} 
                className="hover:text-white p-1 bg-gray-900 rounded cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main image presentation frame */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4 group">
            {/* Left selector */}
            <button 
              onClick={() => { setLightboxIndex(prev => (prev !== null && prev > 0) ? prev - 1 : photos.length - 1); setZoomLevel(1); }}
              className="absolute left-4 p-2 bg-black/60 border border-gray-800 hover:border-cyan-400 text-gray-400 hover:text-cyan-400 rounded-full transition-all duration-200 z-10 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Displaying Image with scale */}
            <div 
              className="transition-transform duration-200 ease-out max-w-full max-h-[80vh] flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img 
                src={photos[lightboxIndex].secureUrl} 
                alt={photos[lightboxIndex].title} 
                className="max-w-full max-h-[80vh] object-contain rounded border border-purple-500/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
              />
            </div>

            {/* Right selector */}
            <button 
              onClick={() => { setLightboxIndex(prev => (prev !== null && prev < photos.length - 1) ? prev + 1 : 0); setZoomLevel(1); }}
              className="absolute right-4 p-2 bg-black/60 border border-gray-800 hover:border-cyan-400 text-gray-400 hover:text-cyan-400 rounded-full transition-all duration-200 z-10 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom metadata banner */}
          <div className="bg-black/60 border-t border-gray-900/60 p-4 text-center text-xs space-y-1.5">
            {photos[lightboxIndex].description && (
              <p className="text-gray-300 font-sans leading-relaxed max-w-2xl mx-auto">
                {photos[lightboxIndex].description}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {photos[lightboxIndex].tags.map((tag, tIdx) => (
                <span key={tIdx} className="font-mono text-[9px] text-gray-400 bg-gray-950/80 border border-gray-800 rounded px-1.5 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

