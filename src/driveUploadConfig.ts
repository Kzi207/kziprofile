export interface DriveUploadConfig {
  proxyUrl: string;
  maxServerUploadBytes: number;
}

export async function getDriveUploadConfig(token: string | null, folder: string): Promise<DriveUploadConfig> {
  const response = await fetch(`/api/drive/upload-config?folder=${encodeURIComponent(folder)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event("drive-session-expired"));
    throw new Error("Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tải lên.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Không đọc được cấu hình tải lên. Vui lòng thử lại.");
  }
  const config = await response.json();
  if (typeof config.proxyUrl !== "string" || !Number.isFinite(config.maxServerUploadBytes) || config.maxServerUploadBytes <= 0) {
    throw new Error("Cấu hình tải lên của máy chủ không hợp lệ.");
  }
  return {
    proxyUrl: config.proxyUrl || (import.meta as any).env?.VITE_CATBOX_PROXY_URL?.trim() || "",
    maxServerUploadBytes: config.maxServerUploadBytes,
  };
}
