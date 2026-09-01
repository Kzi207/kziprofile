import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testCombinedFormats() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);

  console.log("=== Combined Formats (info.streaming_data.formats) ===");
  const combined = info.streaming_data?.formats || [];
  console.log(`Found ${combined.length} combined formats.`);

  for (const fmt of combined) {
    console.log(`\ntag=${fmt.itag}, quality=${fmt.quality_label || fmt.quality}, mime=${fmt.mime_type}`);
    console.log("has url?", Boolean(fmt.url));
    if (fmt.url) {
      console.log("Direct URL:", fmt.url.slice(0, 100) + "...");
      // Test fetch
      const res = await fetch(fmt.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://www.youtube.com/"
        }
      });
      console.log(`Fetch status: ${res.status} ${res.statusText}, Content-Length: ${res.headers.get("content-length")}`);
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const { done, value } = await reader.read();
        console.log(`Read chunk: done=${done}, bytes=${value?.length}`);
      }
    }
  }
}

testCombinedFormats().catch(console.error);
