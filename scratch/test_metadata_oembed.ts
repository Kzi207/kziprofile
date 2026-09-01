import { getYouTubeDownloadInfo } from "../api_dl/youtube.js";

async function testMetadata() {
  const reqMock: any = {
    get: () => "localhost:3000",
    protocol: "http",
    headers: {},
    query: {}
  };

  console.log("Calling getYouTubeDownloadInfo for boKJ5XDs_mY...");
  const res = await getYouTubeDownloadInfo(reqMock, "boKJ5XDs_mY", "mp3");
  console.log("Result:", JSON.stringify(res, null, 2));
}

testMetadata().catch(console.error);
