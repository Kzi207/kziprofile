import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import JSZip from "jszip";
import {
  Cloud,
  Folder,
  FolderLock,
  FolderCheck,
  Lock,
  Download,
  Share2,
  Search,
  Grid,
  List,
  ArrowUpDown,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  RotateCw,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  HardDrive,
  Info,
  Menu,
  Sun,
  Moon,
  RefreshCw,
  AlertCircle,
  FileImage,
  LogOut,
  LogIn,
  CheckSquare,
  Square,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileAudio,
  FileVideo,
  File,
  ExternalLink,
  Eye,
} from "lucide-react";

export interface DriveFolder {
  id: string;
  name: string;
  folder?: string;
  description?: string;
  isShared: boolean;
  shareToken?: string;
  sharedFiles?: string[];
  filesCount: number;
  hasPassword?: boolean;
  allowEdit?: boolean;
  allowDownload?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type FileCategory =
  | "image"
  | "pdf"
  | "word"
  | "sheet"
  | "slide"
  | "text"
  | "media"
  | "archive"
  | "file";

export interface DriveFile {
  name: string;
  size: number;
  sizeFormatted: string;
  mtime: string;
  ext: string;
  category?: FileCategory;
  isShared?: boolean;
  url: string;
  downloadUrl: string;
  isGithub?: boolean;
}

export function getFileCategory(file: { name: string; ext?: string; category?: string }): FileCategory {
  if (file.category && file.category !== "file") return file.category as FileCategory;
  const ext = (file.ext || file.name.split(".").pop() || "").toLowerCase().replace(/^\./, "");
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "avif", "heic", "tiff"].includes(ext)) {
    return "image";
  }
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "rtf", "odt", "pages"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "odp"].includes(ext)) return "slide";
  if (["txt", "md", "json", "xml", "log", "js", "ts", "jsx", "tsx", "html", "css", "sql", "sh", "yaml", "yml"].includes(ext)) {
    return "text";
  }
  if (["mp4", "webm", "mkv", "mov", "avi", "mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
    return "media";
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) return "archive";
  return "file";
}

function getCardBackground(cat: FileCategory) {
  switch (cat) {
    case "pdf":
      return "bg-gradient-to-br from-red-950/70 via-red-900/30 to-black/80 text-red-400 border-red-500/30";
    case "word":
      return "bg-gradient-to-br from-blue-950/70 via-blue-900/30 to-black/80 text-blue-400 border-blue-500/30";
    case "sheet":
      return "bg-gradient-to-br from-emerald-950/70 via-emerald-900/30 to-black/80 text-emerald-400 border-emerald-500/30";
    case "slide":
      return "bg-gradient-to-br from-orange-950/70 via-orange-900/30 to-black/80 text-orange-400 border-orange-500/30";
    case "text":
      return "bg-gradient-to-br from-slate-900 via-cyan-950/40 to-black/80 text-cyan-400 border-cyan-500/30";
    case "media":
      return "bg-gradient-to-br from-purple-950/70 via-purple-900/30 to-black/80 text-purple-400 border-purple-500/30";
    case "archive":
      return "bg-gradient-to-br from-amber-950/70 via-amber-900/30 to-black/80 text-amber-400 border-amber-500/30";
    default:
      return "bg-gradient-to-br from-gray-900 via-gray-800/60 to-black/80 text-gray-400 border-gray-700/40";
  }
}

function renderCategoryIcon(cat: FileCategory, sizeClass = "w-12 h-12") {
  switch (cat) {
    case "pdf":
      return <FileText className={`${sizeClass} text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]`} />;
    case "word":
      return <FileText className={`${sizeClass} text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]`} />;
    case "sheet":
      return <FileSpreadsheet className={`${sizeClass} text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]`} />;
    case "slide":
      return <FileText className={`${sizeClass} text-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]`} />;
    case "text":
      return <FileCode className={`${sizeClass} text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]`} />;
    case "media":
      return <FileVideo className={`${sizeClass} text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]`} />;
    case "archive":
      return <FileArchive className={`${sizeClass} text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]`} />;
    default:
      return <File className={`${sizeClass} text-gray-400`} />;
  }
}

// IN-BROWSER DOCX VIEWER COMPONENT
function DocxViewer({ url, name }: { url: string; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải tệp Word");
        return res.blob();
      })
      .then(async (blob) => {
        if (!isMounted || !containerRef.current) return;
        const { renderAsync } = await import("docx-preview");
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx-rendered-page",
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
        });
        if (isMounted) setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Lỗi khi đọc file Word");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <div className="w-full h-full flex flex-col items-center overflow-auto p-3 sm:p-6 bg-white rounded-xl shadow-2xl text-black" style={{maxHeight: 'calc(100vh - 110px)'}}>
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 text-gray-600 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Đang kết xuất tài liệu Word (.docx)...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
          <FileText className="w-16 h-16 text-blue-500 mb-3" />
          <p className="text-base font-bold text-gray-800 mb-1">{name}</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <a
            href={url}
            download={name}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Tải về máy để mở
          </a>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full max-w-4xl mx-auto overflow-x-auto text-black font-sans leading-relaxed selection:bg-blue-200"
      />
    </div>
  );
}

// IN-BROWSER TEXT & CODE VIEWER COMPONENT
function TextViewer({ url, name }: { url: string; name: string }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setContent("Không thể đọc nội dung tệp văn bản.");
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl h-full flex flex-col rounded-none sm:rounded-xl border-0 sm:border border-gray-800 bg-gray-950 overflow-hidden shadow-2xl" style={{maxHeight: 'calc(100vh - 56px)'}}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 shrink-0">
        <span className="font-mono text-cyan-400 truncate">{name}</span>
        <button
          onClick={copyContent}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>
      </div>
      <div className="flex-1 p-4 overflow-auto font-mono text-xs text-gray-200 whitespace-pre-wrap select-text leading-relaxed" style={{minHeight: 0}}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

export default function DriveApp() {
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("kzi_cloud_theme") as "dark" | "light") || "dark";
  });

  // Admin Auth state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem("cyber_auth_token") || localStorage.getItem("drive_admin_token") || null;
  });
  const [adminUser, setAdminUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("drive_admin_user") || "{}");
    } catch {
      return null;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // App & Data states
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<DriveFolder | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Navigation, Category Filter & View states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc">("date-desc");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Multi-selection states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<Set<string>>(new Set());
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Lightbox Preview states
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Folder Share Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalFolder, setShareModalFolder] = useState<DriveFolder | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareToggling, setShareToggling] = useState(false);

  // Individual File Share Modal states
  const [shareModalFile, setShareModalFile] = useState<DriveFile | null>(null);
  const [fileShareCopied, setFileShareCopied] = useState<string | null>(null);
  const [fileShareToggling, setFileShareToggling] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const isAdmin = useMemo(() => !!adminToken, [adminToken]);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kzi_cloud_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Helper fetch with auth headers
  const authHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }
    return headers;
  }, [adminToken]);

  // Fetch Folders
  const fetchFolders = useCallback(async () => {
    setLoadingFolders(true);
    setErrorMessage(null);
    setIsAccessDenied(false);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shareParam = urlParams.get("share") || urlParams.get("folder");
      const fileParam = urlParams.get("file");

      let apiUrl = "/api/drive/folders";
      const params = new URLSearchParams();
      if (shareParam) params.set("share", shareParam);
      if (fileParam) params.set("file", fileParam);
      if (params.toString()) apiUrl += `?${params.toString()}`;

      const res = await fetch(apiUrl, { headers: authHeaders() });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 403) {
          setIsAccessDenied(true);
          setErrorMessage(
            data.message || "Thư mục này chưa được Quản trị viên (Admin) chia sẻ hoặc đã bị đóng."
          );
          setFolders([]);
          setActiveFolder(null);
          return;
        }
        throw new Error(data.message || "Không thể tải danh sách thư mục");
      }

      const fetchedFolders: DriveFolder[] = data.data || [];
      setFolders(fetchedFolders);

      if (fetchedFolders.length > 0) {
        if (shareParam) {
          const matched =
            fetchedFolders.find(
              (f) =>
                f.id === shareParam ||
                f.folder === shareParam ||
                f.shareToken === shareParam
            ) || fetchedFolders[0];
          setActiveFolder(matched);
        } else {
          setActiveFolder(fetchedFolders[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi nạp thư mục");
    } finally {
      setLoadingFolders(false);
    }
  }, [authHeaders]);

  // Fetch Files
  const fetchFiles = useCallback(async (folder: DriveFolder) => {
    setLoadingFiles(true);
    setSelectedFileNames(new Set());
    setIsSelectMode(false);
    setCategoryFilter("all");

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shareParam = urlParams.get("share") || folder.id || folder.folder || "1";
      const fileParam = urlParams.get("file");

      let apiUrl = `/api/drive/files?folder=${encodeURIComponent(shareParam)}`;
      if (fileParam) {
        apiUrl += `&file=${encodeURIComponent(fileParam)}`;
      }

      const res = await fetch(apiUrl, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 403) {
          setIsAccessDenied(true);
          setErrorMessage(data.message || "Bạn không có quyền truy cập vào thư mục này.");
          setFiles([]);
          return;
        }
        throw new Error(data.message || "Không thể tải danh sách tệp");
      }

      const filesList: DriveFile[] = data.data || [];
      setFiles(filesList);

      // Auto-open requested file in preview
      if (fileParam && Array.isArray(filesList)) {
        const foundIdx = filesList.findIndex((f: DriveFile) => f.name.toLowerCase() === fileParam.toLowerCase());
        if (foundIdx >= 0) {
          setLightboxIndex(foundIdx);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi tải tệp");
    } finally {
      setLoadingFiles(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (activeFolder) {
      fetchFiles(activeFolder);
    } else {
      setFiles([]);
    }
  }, [activeFolder, fetchFiles]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
      }

      setAdminToken(data.token);
      setAdminUser(data.user || { username: loginUsername });
      localStorage.setItem("drive_admin_token", data.token);
      localStorage.setItem("drive_admin_user", JSON.stringify(data.user || { username: loginUsername }));
      setShowLoginModal(false);
      setLoginUsername("");
      setLoginPassword("");
      showToast("Đăng nhập Admin thành công!");
      fetchFolders();
    } catch (err: any) {
      setLoginError(err.message || "Lỗi đăng nhập.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem("drive_admin_token");
    localStorage.removeItem("drive_admin_user");
    localStorage.removeItem("cyber_auth_token");
    showToast("Đã đăng xuất quyền Admin.");
    fetchFolders();
  };

  // Toggle Share Status for Entire Folder (Admin only)
  const handleToggleShare = async (folder: DriveFolder) => {
    if (!isAdmin) return;
    setShareToggling(true);
    try {
      const newStatus = !folder.isShared;
      const res = await fetch("/api/drive/folders/share", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ folderId: folder.id, isShared: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể cập nhật trạng thái chia sẻ");
      }

      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? { ...f, isShared: newStatus } : f))
      );
      if (activeFolder?.id === folder.id) {
        setActiveFolder((prev) => (prev ? { ...prev, isShared: newStatus } : null));
      }
      if (shareModalFolder?.id === folder.id) {
        setShareModalFolder((prev) => (prev ? { ...prev, isShared: newStatus } : null));
      }
      showToast(newStatus ? "Đã bật chia sẻ công khai!" : "Đã tắt chia sẻ (riêng tư)!");
    } catch (err: any) {
      showToast(err.message || "Lỗi cập nhật chia sẻ");
    } finally {
      setShareToggling(false);
    }
  };

  // Toggle Share Status for an Individual File (Admin only)
  const handleToggleFileShare = async (file: DriveFile) => {
    if (!isAdmin || !activeFolder) return;
    setFileShareToggling(true);
    try {
      const newStatus = !file.isShared;
      const res = await fetch("/api/drive/files/share", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          folderId: activeFolder.id,
          filename: file.name,
          isShared: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể cập nhật chia sẻ tệp");
      }

      setFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, isShared: newStatus } : f))
      );
      if (shareModalFile?.name === file.name) {
        setShareModalFile((prev) => (prev ? { ...prev, isShared: newStatus } : null));
      }
      showToast(
        newStatus
          ? `Đã bật chia sẻ riêng cho tệp "${file.name}"!`
          : `Đã tắt chia sẻ riêng tệp "${file.name}"!`
      );
    } catch (err: any) {
      showToast(err.message || "Lỗi cập nhật chia sẻ tệp");
    } finally {
      setFileShareToggling(false);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: files.length,
      image: 0,
      pdf: 0,
      word: 0,
      sheet: 0,
      slide: 0,
      text: 0,
      media: 0,
      archive: 0,
      file: 0,
    };
    files.forEach((f) => {
      const cat = getFileCategory(f);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [files]);

  // Filter & Sort Files
  const filteredFiles = useMemo(() => {
    let result = [...files];
    if (categoryFilter !== "all") {
      result = result.filter((f) => getFileCategory(f) === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
        case "date-asc":
          return new Date(a.mtime).getTime() - new Date(b.mtime).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "size-desc":
          return b.size - a.size;
        case "size-asc":
          return a.size - b.size;
        default:
          return 0;
      }
    });
    return result;
  }, [files, categoryFilter, searchQuery, sortBy]);

  // Selection handlers
  const toggleSelectFile = (fileName: string) => {
    setSelectedFileNames((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFileNames.size === filteredFiles.length) {
      setSelectedFileNames(new Set());
    } else {
      setSelectedFileNames(new Set(filteredFiles.map((f) => f.name)));
    }
  };

  // Batch ZIP Download with JSZip
  const handleDownloadZip = async () => {
    if (selectedFileNames.size === 0 || !activeFolder) return;
    setIsZipping(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const filesToDownload = filteredFiles.filter((f) => selectedFileNames.has(f.name));
      const total = filesToDownload.length;
      let completed = 0;

      await Promise.all(
        filesToDownload.map(async (f) => {
          try {
            const resp = await fetch(f.url);
            const blob = await resp.blob();
            zip.file(f.name, blob);
            completed++;
            setZipProgress(Math.round((completed / total) * 100));
          } catch (e) {
            console.warn(`Không thể nạp tệp ${f.name} vào ZIP:`, e);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${activeFolder.name || "archive"}_selected_files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showToast(`Đã tải xuống thành công ${completed} tệp tin định dạng ZIP!`);
    } catch {
      showToast("Lỗi khi đóng gói tệp ZIP");
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  // Lightbox Gestures & Controls
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoomLevel(1);
    setRotation(0);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setZoomLevel(1);
    setRotation(0);
  };

  const nextLightbox = useCallback(() => {
    if (lightboxIndex === null || filteredFiles.length === 0) return;
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredFiles.length : 0));
    setZoomLevel(1);
    setRotation(0);
  }, [lightboxIndex, filteredFiles.length]);

  const prevLightbox = useCallback(() => {
    if (lightboxIndex === null || filteredFiles.length === 0) return;
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + filteredFiles.length) % filteredFiles.length : 0
    );
    setZoomLevel(1);
    setRotation(0);
  }, [lightboxIndex, filteredFiles.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, prevLightbox, nextLightbox]);

  // Mobile swipe gestures
  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff > 50) prevLightbox();
    else if (diff < -50) nextLightbox();
    touchStartXRef.current = null;
  };

  const currentLightboxFile = lightboxIndex !== null ? filteredFiles[lightboxIndex] : null;
  const currentLightboxCat = currentLightboxFile ? getFileCategory(currentLightboxFile) : "file";

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 select-none ${
        theme === "dark"
          ? "bg-[#080d1a] text-gray-100"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* 1. TOP NAVBAR */}
      <header
        className={`h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 backdrop-blur-md transition-colors ${
          theme === "dark"
            ? "border-cyan-500/20 bg-[#080d1a]/85 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            : "border-gray-200 bg-white/85 shadow-sm"
        }`}
      >
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Mở danh bạ thư mục"
          >
            <Menu className="w-5 h-5" />
          </button>

          <a href="/drive" className="flex items-center gap-2 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-[#080d1a] rounded-[10px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  Kzi Cloud
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold uppercase">
                  Vault
                </span>
              </div>
              <span className="text-[10px] text-gray-400 hidden sm:inline-block">
                Lưu trữ & Chia sẻ đa tệp tin (PDF, Word, Ảnh)
              </span>
            </div>
          </a>
        </div>

        {/* Center: Quick Search (desktop) */}
        <div className="flex-1 max-w-md mx-2 sm:mx-6 hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tệp theo tên..."
              className={`w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                theme === "dark"
                  ? "bg-gray-900/80 border-gray-800 text-gray-200 placeholder-gray-500 focus:border-cyan-500"
                  : "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-600"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={theme === "dark" ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          </button>

          {/* Admin Indicator / Login Button */}
          {isAdmin ? (
            <div className="flex items-center gap-2 pl-1 border-l border-gray-700/50">
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin: {adminUser?.username || "Admin"}</span>
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Đăng xuất quyền Admin"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Quản trị viên</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. BODY LAYOUT (SIDEBAR + MAIN CONTENT) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR FOR FOLDERS */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-64 sm:w-72 bg-[#0c1222] border-r border-gray-800/80 flex flex-col transition-transform duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>Kho Lưu Trữ</span>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <button
              onClick={() => {
                setActiveFolder(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeFolder === null
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">Tất cả thư mục</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-gray-400">
                {folders.length}
              </span>
            </button>

            <div className="pt-2 pb-1 px-3 text-[10px] font-mono uppercase tracking-wider text-gray-400">
              Thư mục khả dụng
            </div>

            {loadingFolders ? (
              <div className="p-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Đang nạp danh bạ...</span>
              </div>
            ) : folders.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                Không tìm thấy thư mục nào.
              </div>
            ) : (
              folders.map((folder) => {
                const isActive = activeFolder?.id === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setActiveFolder(folder);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group cursor-pointer ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {folder.hasPassword ? (
                        <FolderLock className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : folder.isShared ? (
                        <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <span className="truncate">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {folder.isShared && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Đang chia sẻ công khai" />
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/40 text-gray-400">
                        {folder.filesCount}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Phiên bản 2.5 Cyber</span>
            <span className="font-mono text-cyan-500">100% Nguyên gốc</span>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden animate-fadeIn"
          />
        )}

        {/* MAIN CONTENT VIEWPORT */}
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {/* Mobile Search Bar */}
          <div className={`sm:hidden px-3 pt-2.5 pb-0 shrink-0`}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tệp..."
                className={`w-full pl-9 pr-8 py-2 text-xs rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                  theme === "dark"
                    ? "bg-gray-900/80 border-gray-800 text-gray-200 placeholder-gray-500 focus:border-cyan-500"
                    : "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-600"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* SUB-HEADER / TOOLBAR */}
          <div className="p-3 sm:px-6 sm:py-3.5 border-b border-gray-800/80 bg-[#0a0f1d]/50 flex flex-col gap-2.5 shrink-0">
            {/* ROW 1: Breadcrumbs & View Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                <button
                  onClick={() => setActiveFolder(null)}
                  className="text-gray-400 hover:text-cyan-400 transition-colors truncate cursor-pointer"
                >
                  Kho lưu trữ
                </button>
                {activeFolder && (
                  <>
                    <span className="text-gray-600">/</span>
                    <span className="font-bold text-white truncate max-w-[200px] sm:max-w-md">
                      {activeFolder.name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                      {filteredFiles.length} tệp
                    </span>
                  </>
                )}
              </div>

              {/* View Switcher (Grid / List) */}
              <div className="flex items-center gap-1 bg-gray-900/80 p-0.5 rounded-lg border border-gray-800 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "grid" ? "bg-cyan-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                  }`}
                  title="Chế độ lưới"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "list" ? "bg-cyan-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                  }`}
                  title="Chế độ danh sách chi tiết"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ROW 2: Filter, Multi-select, Share Folder */}
            {activeFolder && (
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-700 bg-gray-800/80 text-xs text-gray-300">
                    <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
                    >
                      <option value="date-desc" className="bg-gray-800 text-white">Mới nhất</option>
                      <option value="date-asc" className="bg-gray-800 text-white">Cũ nhất</option>
                      <option value="name-asc" className="bg-gray-800 text-white">Tên (A-Z)</option>
                      <option value="name-desc" className="bg-gray-800 text-white">Tên (Z-A)</option>
                      <option value="size-desc" className="bg-gray-800 text-white">Lớn nhất</option>
                      <option value="size-asc" className="bg-gray-800 text-white">Nhỏ nhất</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      if (isSelectMode) setSelectedFileNames(new Set());
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelectMode
                        ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                        : "bg-gray-800/80 text-gray-300 border-gray-700 hover:text-white hover:border-gray-600"
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isSelectMode ? "Thoát chọn" : "Chọn nhiều"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShareModalFolder(activeFolder);
                      setShowShareModal(true);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-gray-700 bg-gray-800/80 text-gray-300 hover:text-white hover:border-gray-600 transition-all cursor-pointer"
                    title="Chia sẻ toàn bộ thư mục này"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Chia sẻ Thư mục</span>
                  </button>
                </div>

                {isSelectMode && filteredFiles.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-0.5 rounded cursor-pointer shrink-0"
                  >
                    {selectedFileNames.size === filteredFiles.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                )}
              </div>
            )}

            {/* ROW 3: CATEGORY FILTER PILLS */}
            {activeFolder && files.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                {[
                  { id: "all", label: "Tất cả", count: categoryCounts.all },
                  ...(categoryCounts.image > 0 ? [{ id: "image", label: "Hình ảnh", count: categoryCounts.image }] : []),
                  ...(categoryCounts.pdf > 0 ? [{ id: "pdf", label: "Tài liệu PDF", count: categoryCounts.pdf }] : []),
                  ...(categoryCounts.word > 0 ? [{ id: "word", label: "Tài liệu Word", count: categoryCounts.word }] : []),
                  ...(categoryCounts.sheet > 0 ? [{ id: "sheet", label: "Bảng tính (Excel)", count: categoryCounts.sheet }] : []),
                  ...(categoryCounts.text > 0 ? [{ id: "text", label: "Văn bản / Code", count: categoryCounts.text }] : []),
                  ...(categoryCounts.media > 0 ? [{ id: "media", label: "Media / Video", count: categoryCounts.media }] : []),
                  ...(categoryCounts.archive > 0 ? [{ id: "archive", label: "Tệp nén (ZIP)", count: categoryCounts.archive }] : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      categoryFilter === tab.id
                        ? "bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20"
                        : "bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700/60"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        categoryFilter === tab.id
                          ? "bg-black/30 text-black font-bold"
                          : "bg-black/40 text-gray-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MAIN SCROLLABLE VIEWPORT */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 relative">
            {!activeFolder && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Folder className="w-5 h-5 text-cyan-400" />
                    <span>Tất cả Thư mục</span>
                  </h2>
                  <span className="text-xs text-gray-400 font-mono">{folders.length} thư mục</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => setActiveFolder(folder)}
                      className="group p-5 rounded-2xl bg-gray-800/40 hover:bg-gray-800/80 border border-gray-800 hover:border-cyan-500/50 transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                          {folder.hasPassword ? (
                            <FolderLock className="w-6 h-6 text-amber-400" />
                          ) : folder.isShared ? (
                            <FolderCheck className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <Folder className="w-6 h-6 text-cyan-400" />
                          )}
                        </div>

                        {folder.isShared ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Công khai
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-400">
                            Riêng tư
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-white group-hover:text-cyan-400 transition-colors">
                          {folder.name}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                          {folder.description || "Thư mục lưu trữ đa tệp tin."}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
                        <span className="font-mono">{folder.filesCount} tệp</span>
                        <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Mở xem</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFolder && (
              <>
                {loadingFiles ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-3 text-gray-400 animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                    <span className="text-sm font-medium">Đang nạp danh sách tệp tin...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-3 text-gray-400 text-center px-4">
                    <File className="w-12 h-12 text-gray-600" />
                    <div className="text-base font-semibold text-gray-300">Chưa có tệp tin nào trong mục này</div>
                    <p className="text-xs text-gray-500 max-w-sm">
                      {searchQuery
                        ? "Không tìm thấy tệp phù hợp với từ khóa tìm kiếm."
                        : "Thư mục hiện tại chưa có tài liệu hoặc hình ảnh nào."}
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 sm:gap-2.5 pb-20">
                    {filteredFiles.map((file, idx) => {
                      const isSelected = selectedFileNames.has(file.name);
                      const cat = getFileCategory(file);

                      return (
                        <div
                          key={file.name}
                          onClick={() => {
                            if (isSelectMode) {
                              toggleSelectFile(file.name);
                            } else {
                              openLightbox(idx);
                            }
                          }}
                          className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                              : "border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:shadow-lg"
                          }`}
                        >
                          <div className="aspect-square w-full overflow-hidden bg-black/40 relative">
                            {cat === "image" ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div
                                className={`w-full h-full flex flex-col items-center justify-center p-3 select-none transition-transform duration-300 group-hover:scale-105 border ${getCardBackground(
                                  cat
                                )}`}
                              >
                                {renderCategoryIcon(cat)}
                                <span className="mt-2 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-white">
                                  {file.ext}
                                </span>
                              </div>
                            )}

                            {/* Top Left: Selection Checkbox */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectFile(file.name);
                              }}
                              className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all z-10 cursor-pointer ${
                                isSelected
                                  ? "bg-cyan-500 text-black shadow-md opacity-100"
                                  : isSelectMode
                                  ? "bg-black/60 border border-gray-400 text-transparent opacity-100 hover:border-cyan-400"
                                  : "bg-black/50 border border-white/60 text-transparent opacity-0 group-hover:opacity-100 hover:border-cyan-400"
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            {/* Top Right: Individual File Share Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareModalFile(file);
                              }}
                              className="hidden sm:flex absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-cyan-500 text-white hover:text-black opacity-0 group-hover:opacity-100 transition-all shadow-md z-10 cursor-pointer"
                              title="Chia sẻ tệp này"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Bottom Right: Direct Download Button */}
                            <a
                              href={file.downloadUrl}
                              download={file.name}
                              onClick={(e) => e.stopPropagation()}
                              className="hidden sm:flex absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-cyan-500 text-white hover:text-black opacity-0 group-hover:opacity-100 transition-all shadow-md cursor-pointer z-10"
                              title="Tải tệp gốc"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <div className="p-1.5 sm:p-2">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-white truncate" title={file.name}>
                                {file.name}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShareModalFile(file);
                                }}
                                className="sm:hidden p-0.5 text-gray-400 hover:text-cyan-400 cursor-pointer shrink-0"
                                title="Chia sẻ tệp"
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                              <span>{file.sizeFormatted}</span>
                              <span className="uppercase font-mono">{file.ext}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto pb-20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 uppercase font-mono text-[10px]">
                          <th className="py-2.5 px-3 w-8">
                            <button onClick={handleSelectAll} className="text-gray-400 hover:text-white cursor-pointer">
                              {selectedFileNames.size === filteredFiles.length ? (
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">Tên tệp</th>
                          <th className="py-2.5 px-3 hidden sm:table-cell">Kích thước</th>
                          <th className="py-2.5 px-3 hidden md:table-cell">Định dạng</th>
                          <th className="py-2.5 px-3 hidden lg:table-cell">Thời gian</th>
                          <th className="py-2.5 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {filteredFiles.map((file, idx) => {
                          const isSelected = selectedFileNames.has(file.name);
                          const cat = getFileCategory(file);

                          return (
                            <tr
                              key={file.name}
                              onClick={() => {
                                if (isSelectMode) toggleSelectFile(file.name);
                                else openLightbox(idx);
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-cyan-500/10 text-cyan-300" : "hover:bg-white/5"
                              }`}
                            >
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleSelectFile(file.name)}
                                  className="text-gray-400 hover:text-cyan-400 cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
                                {cat === "image" ? (
                                  <img
                                    src={file.url}
                                    alt=""
                                    className="w-7 h-7 rounded object-cover shrink-0 bg-black/40"
                                  />
                                ) : (
                                  <div
                                    className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${getCardBackground(
                                      cat
                                    )}`}
                                  >
                                    {renderCategoryIcon(cat, "w-4 h-4")}
                                  </div>
                                )}
                                <span className="truncate">{file.name}</span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-400 hidden sm:table-cell font-mono">
                                {file.sizeFormatted}
                              </td>
                              <td className="py-2.5 px-3 text-gray-400 hidden md:table-cell font-mono uppercase">
                                {file.ext}
                              </td>
                              <td className="py-2.5 px-3 text-gray-400 hidden lg:table-cell">
                                {new Date(file.mtime).toLocaleDateString("vi-VN")}
                              </td>
                              <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setShareModalFile(file)}
                                    className="inline-flex p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/15 cursor-pointer"
                                    title="Chia sẻ tệp này"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={file.downloadUrl}
                                    download={file.name}
                                    className="inline-flex p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/15"
                                    title="Tải tệp gốc"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 3. MULTI-SELECT FLOATING ACTION BAR */}
      {isSelectMode && selectedFileNames.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 border border-cyan-500/50 backdrop-blur-md rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] px-4 py-3 flex items-center gap-3 animate-slideUp max-w-[92vw]">
          <span className="text-xs sm:text-sm font-semibold text-white">
            Đã chọn <span className="text-cyan-400">{selectedFileNames.size}</span> tệp
          </span>

          <div className="h-4 w-px bg-gray-700" />

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
          >
            {isZipping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang nén ZIP ({zipProgress}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Tải tất cả (.ZIP)</span>
              </>
            )}
          </button>

          <button
            onClick={() => setSelectedFileNames(new Set())}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
            title="Bỏ chọn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. MULTI-FORMAT PREVIEW MODAL */}
      {lightboxIndex !== null && currentLightboxFile && (
        <div
          className="fixed inset-0 bg-black/98 z-50 flex flex-col animate-fadeIn select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Preview Bar */}
          <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-gray-800 bg-black/40 backdrop-blur-md shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={closeLightbox}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                title="Đóng xem trước (Esc)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="truncate">
                <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-md">
                  {currentLightboxFile.name}
                </p>
                <p className="text-[10px] text-gray-400 font-mono">
                  {lightboxIndex + 1} / {filteredFiles.length} · {currentLightboxFile.sizeFormatted} ·{" "}
                  <span className="uppercase text-cyan-400 font-bold">{currentLightboxFile.ext}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Image specific controls */}
              {currentLightboxCat === "image" && (
                <>
                  <button
                    onClick={() => setZoomLevel((z) => (z >= 2.5 ? 1 : z + 0.5))}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 hidden sm:inline-flex cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 hidden sm:inline-flex cursor-pointer"
                    title="Xoay ảnh"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Open in new tab for docs & media */}
              {currentLightboxCat !== "image" && (
                <a
                  href={currentLightboxFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Mở trong thẻ trình duyệt mới"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mở thẻ mới</span>
                </a>
              )}

              {/* Share File Button */}
              <button
                onClick={() => setShareModalFile(currentLightboxFile)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Chia sẻ tệp này"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </button>

              {/* Direct Download Button */}
              <a
                href={currentLightboxFile.downloadUrl}
                download={currentLightboxFile.name}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tải tệp gốc về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải về</span>
              </a>

              <button
                onClick={closeLightbox}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Preview Container */}
          <div className={`flex-1 flex items-center justify-center relative overflow-hidden ${
            (currentLightboxCat === "pdf" || currentLightboxCat === "word" || currentLightboxCat === "text")
              ? "p-0"
              : "p-2"
          }`}>
            {/* Prev / Next Buttons */}
            <button
              onClick={prevLightbox}
              className="absolute left-3 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white z-20 backdrop-blur-sm transition-all cursor-pointer shadow-lg"
              title="Tệp trước (Mũi tên trái)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextLightbox}
              className="absolute right-3 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white z-20 backdrop-blur-sm transition-all cursor-pointer shadow-lg"
              title="Tệp tiếp theo (Mũi tên phải)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Content Display Switcher */}
            {currentLightboxCat === "image" && (
              <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={currentLightboxFile.url}
                  alt={currentLightboxFile.name}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}

            {currentLightboxCat === "pdf" && (
              <div className="w-full h-full rounded-none sm:rounded-xl overflow-hidden border-0 sm:border border-gray-700 bg-[#525659] shadow-2xl relative flex flex-col" style={{maxHeight: 'calc(100vh - 56px)'}}>
                <div className="bg-gray-900 px-3 py-1.5 flex items-center justify-between border-b border-gray-800 text-xs shrink-0">
                  <span className="text-red-400 font-mono font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> PDF — {currentLightboxFile.name.length > 30 ? currentLightboxFile.name.substring(0,27)+'...' : currentLightboxFile.name}
                  </span>
                  <a
                    href={currentLightboxFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-gray-300 hover:text-white px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở tab mới</span>
                  </a>
                </div>
                <iframe
                  src={`${currentLightboxFile.url}#toolbar=1&view=FitH`}
                  className="w-full flex-1 border-none bg-white"
                  title={currentLightboxFile.name}
                  style={{minHeight: 0}}
                />
              </div>
            )}

            {currentLightboxCat === "word" && (
              <div className="w-full h-full rounded-none sm:rounded-xl overflow-hidden border-0 sm:border border-gray-700 bg-gray-950 shadow-2xl relative flex flex-col" style={{maxHeight: 'calc(100vh - 56px)'}}>
                <div className="bg-gray-900 px-3 py-1.5 flex items-center justify-between border-b border-gray-800 text-xs shrink-0">
                  <span className="text-blue-400 font-mono font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Word — {currentLightboxFile.name.length > 30 ? currentLightboxFile.name.substring(0,27)+'...' : currentLightboxFile.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={currentLightboxFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-300 hover:text-white px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Mở tệp</span>
                    </a>
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-900/40 p-1 sm:p-3" style={{minHeight: 0}}>
                  {currentLightboxFile.ext.toLowerCase() === "docx" ? (
                    <DocxViewer url={currentLightboxFile.url} name={currentLightboxFile.name} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <FileText className="w-20 h-20 text-blue-400 mb-4 animate-bounce" />
                      <h4 className="text-lg font-bold text-white mb-2">{currentLightboxFile.name}</h4>
                      <p className="text-sm text-gray-400 max-w-md mb-6">
                        Định dạng Word ({currentLightboxFile.ext}). Bạn có thể tải về để mở trực tiếp trong Microsoft Word hoặc Office.
                      </p>
                      <a
                        href={currentLightboxFile.downloadUrl}
                        download={currentLightboxFile.name}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25"
                      >
                        <Download className="w-4 h-4" /> Tải về máy
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentLightboxCat === "text" && (
              <TextViewer url={currentLightboxFile.url} name={currentLightboxFile.name} />
            )}

            {currentLightboxCat === "media" && (
              <div className="max-w-full max-h-[82vh] flex flex-col items-center justify-center p-4">
                {["mp4", "webm", "mkv", "mov"].includes(currentLightboxFile.ext.toLowerCase()) ? (
                  <video
                    controls
                    autoPlay
                    src={currentLightboxFile.url}
                    className="max-h-[78vh] max-w-[90vw] rounded-xl shadow-2xl"
                  />
                ) : (
                  <div className="p-8 rounded-2xl bg-gray-900 border border-purple-500/30 flex flex-col items-center gap-5 shadow-2xl max-w-md w-full">
                    <FileAudio className="w-20 h-20 text-purple-400 animate-pulse" />
                    <div className="text-center">
                      <p className="text-base font-semibold text-white truncate max-w-xs">{currentLightboxFile.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">{currentLightboxFile.sizeFormatted}</p>
                    </div>
                    <audio controls autoPlay src={currentLightboxFile.url} className="w-full" />
                  </div>
                )}
              </div>
            )}

            {(currentLightboxCat === "sheet" ||
              currentLightboxCat === "slide" ||
              currentLightboxCat === "archive" ||
              currentLightboxCat === "file") && (
              <div className="max-w-md w-full p-8 rounded-2xl bg-gray-900 border border-gray-700 flex flex-col items-center text-center shadow-2xl">
                {currentLightboxCat === "sheet" ? (
                  <FileSpreadsheet className="w-20 h-20 text-emerald-400 mb-4" />
                ) : currentLightboxCat === "archive" ? (
                  <FileArchive className="w-20 h-20 text-amber-400 mb-4" />
                ) : (
                  <File className="w-20 h-20 text-gray-400 mb-4" />
                )}
                <h4 className="text-lg font-bold text-white mb-1 truncate max-w-xs">{currentLightboxFile.name}</h4>
                <p className="text-xs text-gray-400 font-mono mb-6">
                  {currentLightboxFile.sizeFormatted} · Định dạng {currentLightboxFile.ext}
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={currentLightboxFile.downloadUrl}
                    download={currentLightboxFile.name}
                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                  >
                    <Download className="w-4 h-4" /> Tải về máy
                  </a>
                  <a
                    href={currentLightboxFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mở trực tiếp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5a. FOLDER SHARE MODAL */}
      {showShareModal && shareModalFolder && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="max-w-md w-full rounded-2xl bg-[#0f172a] border border-cyan-500/30 p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Chia sẻ Thư mục</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                <div className="text-xs text-gray-400">Tên thư mục</div>
                <div className="font-bold text-white text-sm">{shareModalFolder.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{shareModalFolder.filesCount} tệp tin</div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 text-xs">
                  {shareModalFolder.isShared ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-300 font-semibold">Đang chia sẻ công khai</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-amber-300 font-semibold">Đang ở chế độ riêng tư</span>
                    </>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleToggleShare(shareModalFolder)}
                    disabled={shareToggling}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      shareModalFolder.isShared
                        ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40"
                        : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                    }`}
                  >
                    {shareToggling ? "Đang xử lý..." : shareModalFolder.isShared ? "Khóa lại" : "Bật chia sẻ"}
                  </button>
                )}
              </div>

              {/* Share URL */}
              {shareModalFolder.isShared ? (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Liên kết chia sẻ khách (Chỉ xem):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/drive?share=${encodeURIComponent(
                        shareModalFolder.id
                      )}`}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/drive?share=${encodeURIComponent(
                          shareModalFolder.id
                        )}`;
                        navigator.clipboard.writeText(link);
                        setShareCopied(true);
                        showToast("Đã sao chép liên kết vào bộ nhớ tạm!");
                        setTimeout(() => setShareCopied(false), 2000);
                      }}
                      className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{shareCopied ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  Thư mục này hiện tại không chia sẻ công khai. Người ngoài khi truy cập qua URL sẽ bị chặn với mã 403 Forbidden.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5b. INDIVIDUAL FILE SHARE MODAL */}
      {shareModalFile && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="max-w-md w-full rounded-2xl bg-[#0f172a] border border-cyan-500/30 p-5 sm:p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Chia sẻ Tệp tin</h3>
              </div>
              <button
                onClick={() => setShareModalFile(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Info Card */}
            <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${getCardBackground(
                  getFileCategory(shareModalFile)
                )}`}
              >
                {renderCategoryIcon(getFileCategory(shareModalFile), "w-6 h-6")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-xs sm:text-sm truncate" title={shareModalFile.name}>
                  {shareModalFile.name}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                  <span>{shareModalFile.sizeFormatted}</span>
                  <span>·</span>
                  <span className="uppercase text-cyan-400 font-semibold">{shareModalFile.ext}</span>
                </div>
              </div>
            </div>

            {/* Access Status / Toggle */}
            <div className="p-3 rounded-xl border border-gray-800 bg-gray-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  {activeFolder?.isShared || shareModalFile.isShared ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-300 font-semibold">Tệp có thể xem công khai</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-amber-300 font-semibold">Chế độ riêng tư</span>
                    </>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleToggleFileShare(shareModalFile)}
                    disabled={fileShareToggling}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                      shareModalFile.isShared
                        ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40"
                        : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                    }`}
                  >
                    {fileShareToggling
                      ? "Đang lưu..."
                      : shareModalFile.isShared
                      ? "Hủy chia sẻ riêng"
                      : "Chia sẻ riêng tệp này"}
                  </button>
                )}
              </div>

              {/* Note when folder is already public */}
              {activeFolder?.isShared && (
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  ℹ️ Thư mục đang <span className="text-emerald-400 font-semibold">công khai</span> — tất cả file đều có thể xem. Chia sẻ riêng tệp chỉ có tác dụng khi thư mục ở chế độ riêng tư.
                </p>
              )}
            </div>

            {/* Share Links */}
            <div className="space-y-3">
              {/* Link 1: View / Preview */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium">Liên kết xem tệp trực tiếp:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/drive?share=${encodeURIComponent(
                      activeFolder?.id || "1"
                    )}&file=${encodeURIComponent(shareModalFile.name)}`}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none truncate"
                  />
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/drive?share=${encodeURIComponent(
                        activeFolder?.id || "1"
                      )}&file=${encodeURIComponent(shareModalFile.name)}`;
                      navigator.clipboard.writeText(link);
                      setFileShareCopied("view");
                      showToast("Đã sao chép liên kết xem tệp!");
                      setTimeout(() => setFileShareCopied(null), 2000);
                    }}
                    className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {fileShareCopied === "view" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{fileShareCopied === "view" ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>
              </div>

              {/* Link 2: Direct Download */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium">Liên kết tải xuống trực tiếp:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/drive/download?folder=${encodeURIComponent(
                      activeFolder?.id || "1"
                    )}&file=${encodeURIComponent(shareModalFile.name)}`}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none truncate"
                  />
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/api/drive/download?folder=${encodeURIComponent(
                        activeFolder?.id || "1"
                      )}&file=${encodeURIComponent(shareModalFile.name)}`;
                      navigator.clipboard.writeText(link);
                      setFileShareCopied("download");
                      showToast("Đã sao chép liên kết tải xuống!");
                      setTimeout(() => setFileShareCopied(null), 2000);
                    }}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {fileShareCopied === "download" ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{fileShareCopied === "download" ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>
              </div>

              {/* Native Web Share Button if supported */}
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/drive?share=${encodeURIComponent(
                      activeFolder?.id || "1"
                    )}&file=${encodeURIComponent(shareModalFile.name)}`;
                    navigator
                      .share({
                        title: shareModalFile.name,
                        text: `Xem tệp ${shareModalFile.name} trên Kzi Cloud`,
                        url: link,
                      })
                      .catch(() => {});
                  }}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Gửi nhanh qua ứng dụng (Zalo, Messenger...)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. ADMIN LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="max-w-sm w-full rounded-2xl bg-[#0f172a] border border-cyan-500/40 p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Đăng nhập Quản trị viên</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-1">Tài khoản</label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin..."
                  className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>Xác thực Admin</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. ACCESS DENIED MODAL (STRICT PRIVACY / SECURITY ERROR) */}
      {isAccessDenied && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="max-w-md w-full rounded-2xl bg-[#0f172a] border border-red-500/40 p-6 sm:p-8 text-center space-y-4 shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-white">403 - Quyền Truy Cập Bị Từ Chối</h3>
              <p className="text-xs text-gray-400 font-mono">STRICT ACCESS CONTROL ENFORCED</p>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-red-950/20 border border-red-900/30 p-3.5 rounded-xl">
              {errorMessage || "Thư mục này chưa được Quản trị viên (Admin) chia sẻ hoặc đã bị đóng."}
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href="/drive"
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs transition-colors"
              >
                Về trang chủ Drive
              </a>
              <button
                onClick={() => {
                  setIsAccessDenied(false);
                  setShowLoginModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Đăng nhập Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900/95 border border-cyan-500/50 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs flex items-center gap-2 animate-slideUp backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
