import { searchYouTube, getYouTubeDownloadInfo } from "../api_dl/youtube.js";

async function testYouTubeAPI() {
  console.log("Testing searchYouTube...");
  const searchRes = await searchYouTube("Sơn Tùng M-TP");
  console.log("Search result status:", searchRes.status, "Total items:", searchRes.total);

  console.log("\nTesting getYouTubeDownloadInfo...");
  const mockReq = {
    protocol: "http",
    get: (header: string) => header.toLowerCase() === "host" ? "localhost:3000" : undefined,
    headers: {}
  } as any;

  const infoRes = await getYouTubeDownloadInfo(mockReq, "boKJ5XDs_mY", "mp3");
  console.log("Download info status:", infoRes.status);
  console.log("Title:", infoRes.title);
  console.log("Stream URL:", infoRes.stream_url);
}

testYouTubeAPI().catch(console.error);
