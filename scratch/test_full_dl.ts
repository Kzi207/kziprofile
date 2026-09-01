import { searchYouTube, getYouTubeDownloadInfo } from "../api_dl/youtube.js";
import { searchSoundCloud, getSoundCloudDownloadInfo } from "../api_dl/soundcloud.js";

async function testAll() {
  console.log("=== 1. Testing YouTube Search ===");
  const ytSearch = await searchYouTube("Lưu Niên");
  console.log("Status:", ytSearch.status, "| Items:", ytSearch.data.length);
  if (ytSearch.data.length > 0) {
    console.log("Top result:", ytSearch.data[0].title);
  }

  console.log("\n=== 2. Testing YouTube Download Info ===");
  const mockReq = {
    protocol: "http",
    get: (header: string) => header.toLowerCase() === "host" ? "anime-cyberpunk-portfolio.vercel.app" : undefined,
    headers: { "x-forwarded-proto": "https" }
  } as any;

  const ytInfo = await getYouTubeDownloadInfo(mockReq, "boKJ5XDs_mY", "mp3");
  console.log("Status:", ytInfo.status);
  console.log("Title:", ytInfo.title);
  console.log("Stream URL:", ytInfo.stream_url);

  console.log("\n=== 3. Testing SoundCloud Search ===");
  const scSearch = await searchSoundCloud("Lưu Niên");
  console.log("Status:", scSearch.status, "| Items:", scSearch.data.length);

  console.log("\n=== 4. Testing SoundCloud Download Info ===");
  const scInfo = await getSoundCloudDownloadInfo(mockReq, "1959700875", "mp3");
  console.log("Status:", scInfo.status);
  console.log("Title:", scInfo.title);
  console.log("Stream URL:", scInfo.stream_url);
}

testAll().catch(console.error);
