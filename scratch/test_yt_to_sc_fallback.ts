import { searchSoundCloud, getSoundCloudDownloadInfo } from "../api_dl/soundcloud.js";

async function testYtToScFallback() {
  const query = "Lưu Niên Jack J97";
  console.log(`Searching SoundCloud fallback for YouTube query: "${query}"...`);

  const scResult = await searchSoundCloud(query);
  console.log(`SoundCloud returned ${scResult.total} matches!`);

  if (scResult.data.length > 0) {
    const topTrack = scResult.data[0];
    console.log("Top SoundCloud match:", topTrack.title, "| URL:", topTrack.url);
  }
}

testYtToScFallback().catch(console.error);
