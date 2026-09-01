import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testDownloadOptions() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);

  console.log("=== 1. Testing info.download() ===");
  try {
    const stream = await info.download({
      quality: "best",
      type: "audio"
    });

    const reader = stream.getReader();
    const { done, value } = await reader.read();
    console.log(`info.download() -> done=${done}, bytes=${value?.length}`);
  } catch (err: any) {
    console.log("info.download() failed:", err.message);
  }

  console.log("\n=== 2. Testing format.decipher with different format methods ===");
  const formats = info.streaming_data?.adaptive_formats || [];
  for (const fmt of formats) {
    if (fmt.has_audio && !fmt.has_video) {
      try {
        console.log(`Testing decipher for itag=${fmt.itag}...`);
        const decipheredUrl = await fmt.decipher(yt.session.player);
        console.log("Deciphered URL success:", decipheredUrl ? decipheredUrl.slice(0, 80) + "..." : "NONE");
      } catch (err: any) {
        console.log(`Decipher for itag=${fmt.itag} failed: ${err.message}`);
      }
    }
  }
}

testDownloadOptions().catch(console.error);
