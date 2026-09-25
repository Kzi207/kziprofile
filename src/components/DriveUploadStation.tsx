import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Folder,
  File,
  FileImage,
  FileText,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Check,
  X,
  Plus,
  Layers,
  Database,
  Link as LinkIcon
} from "lucide-react";
import { DriveFolder, DriveFile, getFileCategory, FileCategory } from "./DriveApp";

interface DriveUploadStationProps {
  folders: DriveFolder[];
  activeFolder: DriveFolder | null;
  onFolderSelect: (folder: DriveFolder) => void;
  onRefreshFolders: () => void;
  onSwitchToFiles: (folderId?: string) => void;
  showToast: (msg: string) => void;
  theme: "dark" | "light";
  adminToken: string | null;
}

interface StagedUploadFile {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "pending" | "uploading" | "success" | "error";
  progressText: string;
  localUrl?: string;
  catboxUrl?: string;
  backupStatus?: string;
  errorMessage?: string;
}

interface DbFileItem {
  id: string;
  folderId: string;
  name: string;
  size: number;
  sizeFormatted: string;
  ext: string;
  localUrl: string;
  catboxUrl: string;
  backupStatus?: string;
  lastChecked?: string;
  createdAt: string;
}

export default function DriveUploadStation({
  folders,
  activeFolder,
  onFolderSelect,
  onRefreshFolders,
  onSwitchToFiles,
  showToast,
  theme,
  adminToken,
}: DriveUploadStationProps) {
  // Target folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => {
    return activeFolder?.id || (folders.length > 0 ? folders[0].id : "img");
  });
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Staged files for upload
  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DB files & Sync state
  const [dbFiles, setDbFiles] = useState<DbFileItem[]>([]);
  const [loadingDbFiles, setLoadingDbFiles] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<any | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Active sub-tab
  const [subTab, setSubTab] = useState<"upload" | "db-manager">("upload");

  // Safe JSON Parser helper to prevent "Unexpected token <" HTML parse crash
  const safeParseJson = async (res: Response, fallbackError = "Lỗi phản hồi máy chủ") => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    const text = await res.text().catch(() => "");
    throw new Error(text.slice(0, 150) || `${fallbackError} (${res.status})`);
  };

  // Fetch registered files from DB
  const fetchDbFiles = async () => {
    setLoadingDbFiles(true);
    try {
      const res = await fetch("/api/drive/db-files");
      const data = await safeParseJson(res, "Không thể đọc dữ liệu DB");
      if (data.success) {
        setDbFiles(data.data || []);
      }
    } catch (e: any) {
      console.warn("Lỗi tải db-files:", e.message);
    } finally {
      setLoadingDbFiles(false);
    }
  };

  useEffect(() => {
    fetchDbFiles();
  }, []);

  // Update folder selection if activeFolder changes
  useEffect(() => {
    if (activeFolder && !selectedFolderId) {
      setSelectedFolderId(activeFolder.id);
    }
  }, [activeFolder]);

  // Handle files selection
  const handleFilesChosen = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const newStaged: StagedUploadFile[] = Array.from(filesList).map((f) => {
      const isImg = f.type.startsWith("image/");
      return {
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file: f,
        previewUrl: isImg ? URL.createObjectURL(f) : null,
        status: "pending",
        progressText: "Chờ tải lên...",
      };
    });

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAllStaged = () => {
    stagedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setStagedFiles([]);
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Upload single file via high-speed FormData
  const uploadSingleFile = async (staged: StagedUploadFile, targetFolder: string) => {
    setStagedFiles((prev) =>
      prev.map((item) =>
        item.id === staged.id
          ? { ...item, status: "uploading", progressText: "Đang tải nhanh lên Catbox.moe..." }
          : item
      )
    );

    try {
      if (staged.file.size > 200 * 1024 * 1024) {
        throw new Error(`Dung lượng tệp (${(staged.file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn 200MB của Catbox.moe!`);
      }

      const formData = new FormData();
      formData.append("file", staged.file);
      formData.append("folder", targetFolder);

      const headers: Record<string, string> = {};
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await safeParseJson(res, "Tải lên thất bại");

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Tải lên thất bại");
      }

      setStagedFiles((prev) =>
        prev.map((item) =>
          item.id === staged.id
            ? {
                ...item,
                status: "success",
                progressText: data.file?.catboxUrl ? "Đã lưu Catbox.moe & DB!" : "Đã lưu thành công!",
                localUrl: data.file?.url,
                catboxUrl: data.file?.catboxUrl,
                backupStatus: data.file?.backupStatus,
              }
            : item
        )
      );

      showToast(`✅ Đã tải lên thành công: "${staged.file.name}"`);
      return true;
    } catch (err: any) {
      setStagedFiles((prev) =>
        prev.map((item) =>
          item.id === staged.id
            ? {
                ...item,
                status: "error",
                progressText: "Lỗi tải lên",
                errorMessage: err.message || "Lỗi không xác định",
              }
            : item
        )
      );
      return false;
    }
  };

  // Upload all pending files (with 3-thread parallel concurrency for maximum speed)
  const handleUploadAll = async () => {
    const targetFolder = isCreatingNewFolder ? newFolderName.trim() : selectedFolderId;
    if (!targetFolder) {
      showToast("Vui lòng chọn hoặc nhập tên thư mục lưu trữ!");
      return;
    }

    const pending = stagedFiles.filter((f) => f.status === "pending" || f.status === "error");
    if (pending.length === 0) {
      showToast("Không có tệp nào cần tải lên!");
      return;
    }

    setIsUploadingAll(true);
    let successCount = 0;

    // Parallel queue with concurrency = 3
    const concurrency = 3;
    const queue = [...pending];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          const ok = await uploadSingleFile(item, targetFolder);
          if (ok) successCount++;
        }
      }
    });

    await Promise.all(workers);

    setIsUploadingAll(false);
    showToast(`Đã tải lên hoàn tất ${successCount}/${pending.length} tệp!`);
    fetchDbFiles();
    onRefreshFolders();
  };

  // Run Auto-Repair & Backup sync
  const handleRunSyncBackup = async () => {
    setIsSyncing(true);
    setSyncReport(null);
    try {
      const res = await fetch("/api/drive/sync-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: selectedFolderId }),
      });
      const data = await safeParseJson(res, "Lỗi kiểm tra backup");
      if (data.success) {
        setSyncReport(data);
        showToast(data.message || "Đã kiểm tra và đồng bộ liên kết 404 thành công!");
        fetchDbFiles();
      } else {
        showToast("Lỗi đồng bộ: " + (data.message || "Không thể thực hiện"));
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối máy chủ khi kiểm tra 404!");
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    showToast(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#070b16] text-gray-200">
      {/* 1. HERO HEADER */}
      <div className="relative border-b border-gray-800/80 bg-gradient-to-b from-[#0e172e] via-[#090f20] to-[#070b16] px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                <Upload className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                DRIVE UPLOAD CENTRAL // ⚡
              </h1>
            </div>
            <p className="text-xs text-cyan-300/80 font-mono tracking-wide flex items-center gap-2">
              <span>DUAL-STORAGE GATEWAY: MÁY CHỦ LOCAL + CATBOX.MOE CLOUD</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchToFiles(selectedFolderId)}
              className="px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-gray-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Folder className="w-4 h-4 text-cyan-400" />
              <span>&lt; Xem Kho Tệp Tin</span>
            </button>

            <button
              onClick={handleRunSyncBackup}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50"
              title="Kiểm tra xem link nào 404 để tự động phục hồi từ link còn sống"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Đang quét 404..." : "Quét & Phục Hồi 404"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DUAL BACKUP BANNER */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 pt-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-purple-950/40 border border-cyan-500/30 backdrop-blur-md shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Cơ chế Dual-Backup Link An Toàn Tuyệt Đối</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
                  Bảo vệ 2 chiều
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                Tất cả tệp tải lên sẽ đồng thời được lưu trữ tại <strong>Máy chủ Local (`drive/`)</strong> và tải lên <strong>Catbox.moe Cloud</strong>. Nếu bất kỳ 1 trong 2 link gặp lỗi 404, hệ thống sẽ tự động dùng link còn lại để khôi phục!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-gray-700/60 flex items-center gap-2 text-cyan-300">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Local Drive: OK</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-gray-700/60 flex items-center gap-2 text-pink-300">
              <Cloud className="w-3.5 h-3.5 text-pink-400" />
              <span>Catbox.moe: OK</span>
            </div>
          </div>
        </div>

        {/* Sync Report Banner if available */}
        {syncReport && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">{syncReport.message}</p>
                <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                  Tổng kiểm tra: {syncReport.stats?.total} tệp | Khỏe: {syncReport.stats?.healthy} | Phục hồi Local: {syncReport.stats?.localRestored} | Phục hồi Catbox: {syncReport.stats?.catboxRestored}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSyncReport(null)}
              className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN SECTION WITH SUBTABS */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <button
            onClick={() => setSubTab("upload")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "upload"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Lên Tệp Mới</span>
            {stagedFiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-white text-[10px] font-mono">
                {stagedFiles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setSubTab("db-manager");
              fetchDbFiles();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === "db-manager"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Kho Tệp Trong DB ({dbFiles.length})</span>
          </button>
        </div>

        {subTab === "upload" ? (
          <div className="space-y-6">
            {/* TARGET FOLDER CONFIG */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <span>1. Chọn Thư Mục Lưu Trữ Đích</span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {!isCreatingNewFolder ? (
                  <div className="flex-1 relative">
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} ({f.filesCount} tệp)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nhập tên thư mục mới (ví dụ: tailieu, video, baitap)..."
                      className="w-full bg-gray-950 border border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsCreatingNewFolder(!isCreatingNewFolder)}
                  className="px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  {isCreatingNewFolder ? (
                    <>
                      <X className="w-3.5 h-3.5 text-red-400" />
                      <span>Chọn thư mục có sẵn</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tạo thư mục mới</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PRIVACY POLICY: Mặc định tệp không chia sẻ */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200/90 text-xs shadow-sm">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[11px] shrink-0">
                🔒 MẶC ĐỊNH RIÊNG TƯ
              </span>
              <p className="leading-relaxed">
                Tất cả tệp tải lên mặc định <strong>KHÔNG CHIA SẺ</strong> (chỉ Quản trị viên nhìn thấy). Quản trị viên có thể bật chia sẻ cho từng tệp bất cứ lúc nào trong bảng quản lý tệp.
              </p>
            </div>

            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesChosen(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 ${
                isDragging
                  ? "border-cyan-400 bg-cyan-500/10 scale-[1.01]"
                  : "border-gray-700/80 bg-gray-950/40 hover:border-cyan-500/50 hover:bg-cyan-950/10"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFilesChosen(e.target.files)}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <Cloud className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Kéo thả tệp vào đây hoặc <span className="text-cyan-400 underline underline-offset-4">Chọn từ máy tính</span>
                </p>
                <p className="text-xs text-gray-400">
                  Hỗ trợ tải lên nhiều tệp cùng lúc: Ảnh (JPG, PNG, WebP), Video (MP4), Âm thanh (MP3), PDF, DOCX, ZIP, Code...
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-mono text-gray-400">
                <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800">Catbox.moe Cloud</span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800">Local Disk Storage</span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800">PostgreSQL DB Record</span>
              </div>
            </div>

            {/* STAGED FILES QUEUE */}
            {stagedFiles.length > 0 && (
              <div className="p-4 sm:p-6 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">Danh Sách Tệp Đã Chọn ({stagedFiles.length})</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearAllStaged}
                      disabled={isUploadingAll}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Xóa tất cả
                    </button>
                    <button
                      onClick={handleUploadAll}
                      disabled={isUploadingAll}
                      className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.35)] cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingAll ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang Tải Lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Bắt Đầu Tải Lên Tất Cả</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Staged Items List */}
                <div className="divide-y divide-gray-800/80">
                  {stagedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {item.previewUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-700 shrink-0 bg-black">
                            <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-cyan-400 shrink-0">
                            <File className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <p className="font-semibold text-gray-200 truncate">{item.file.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {(item.file.size / 1024).toFixed(1)} KB • {item.file.type || "file"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Status & Action links */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {item.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-[10px] font-mono">
                            Sẵn sàng
                          </span>
                        )}

                        {item.status === "uploading" && (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>{item.progressText}</span>
                          </span>
                        )}

                        {item.status === "error" && (
                          <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{item.errorMessage || "Lỗi tải"}</span>
                          </span>
                        )}

                        {item.status === "success" && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Local Link button */}
                            {item.localUrl && (
                              <button
                                onClick={() => copyToClipboard(window.location.origin + item.localUrl, "Link Máy Chủ")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                                title="Sao chép link tải từ máy chủ"
                              >
                                <HardDrive className="w-3 h-3" />
                                <span>Copy Local</span>
                              </button>
                            )}

                            {/* Catbox Link button */}
                            {item.catboxUrl && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => copyToClipboard(item.catboxUrl!, "Link Catbox.moe")}
                                  className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                                  title="Sao chép link tải từ Catbox.moe"
                                >
                                  <Cloud className="w-3 h-3" />
                                  <span>Copy Catbox</span>
                                </button>
                                <a
                                  href={item.catboxUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                                  title="Mở trên Catbox.moe"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}

                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                              DUAL OK
                            </span>
                          </div>
                        )}

                        {item.status !== "uploading" && (
                          <button
                            onClick={() => removeStagedFile(item.id)}
                            className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Bỏ tệp này"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* SUBTAB 2: DB FILE RECORDS & DUAL LINK MANAGER */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>Cơ Sở Dữ Liệu Tệp Drive (PostgreSQL + Local Cache)</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Tất cả bản ghi tệp đã nạp vào Database cùng 2 liên kết (Local Server & Catbox.moe Cloud).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDbFiles}
                  disabled={loadingDbFiles}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDbFiles ? "animate-spin" : ""}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {loadingDbFiles ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs">Đang tải dữ liệu tệp từ cơ sở dữ liệu...</p>
              </div>
            ) : dbFiles.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-gray-950/40 border border-gray-800 text-gray-400 space-y-3">
                <Database className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm">Chưa có bản ghi tệp nào trong Database.</p>
                <button
                  onClick={() => setSubTab("upload")}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs cursor-pointer hover:bg-cyan-400 transition-colors"
                >
                  Tải lên tệp đầu tiên
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 overflow-hidden bg-gray-950/60 shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0b1020] text-gray-400 font-mono uppercase text-[10px] border-b border-gray-800">
                      <tr>
                        <th className="py-3 px-4">Tên tệp</th>
                        <th className="py-3 px-4">Thư mục</th>
                        <th className="py-3 px-4">Dung lượng</th>
                        <th className="py-3 px-4">Liên kết Local</th>
                        <th className="py-3 px-4">Liên kết Catbox.moe</th>
                        <th className="py-3 px-4">Trạng thái Dual</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {dbFiles.map((file) => {
                        const localFull = window.location.origin + file.localUrl;
                        return (
                          <tr key={file.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-white max-w-[200px] truncate">
                              {file.name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded bg-gray-800 text-cyan-300 font-mono text-[10px]">
                                {file.folderId}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                              {file.sizeFormatted}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => copyToClipboard(localFull, "Link Local")}
                                className="px-2.5 py-1 rounded bg-gray-800/80 hover:bg-gray-700 text-cyan-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                                title={localFull}
                              >
                                <HardDrive className="w-3 h-3 text-cyan-400" />
                                <span>Copy Local</span>
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              {file.catboxUrl ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copyToClipboard(file.catboxUrl, "Link Catbox.moe")}
                                    className="px-2.5 py-1 rounded bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/30 text-pink-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                                    title={file.catboxUrl}
                                  >
                                    <Cloud className="w-3 h-3 text-pink-400" />
                                    <span>Copy Catbox</span>
                                  </button>
                                  <a
                                    href={file.catboxUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-gray-400 hover:text-white"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-mono">Chưa có</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {file.backupStatus === "both_active" ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[9px] flex items-center gap-1 w-fit">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>2 Link Sống</span>
                                </span>
                              ) : file.backupStatus === "local_restored" ? (
                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[9px] flex items-center gap-1 w-fit">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  <span>Đã cứu từ Catbox</span>
                                </span>
                              ) : file.backupStatus === "catbox_restored" ? (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-[9px] flex items-center gap-1 w-fit">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  <span>Đã cứu lên Catbox</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-[9px]">
                                  {file.backupStatus || "Local only"}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => onSwitchToFiles(file.folderId)}
                                className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
