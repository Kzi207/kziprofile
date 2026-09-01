import { getYT } from "../api_dl/youtube.js";

async function testDownloadRange() {
  const yt = await getYT();
  
  // Test if download accepts range option or start
  console.log("Downloading with range...");
  const stream = await yt.download("BaRopiZaOSo", {
    client: "ANDROID",
    quality: "best"
  });

  console.log("Stream created:", Boolean(stream));
  process.exit(0);
}

testDownloadRange();
