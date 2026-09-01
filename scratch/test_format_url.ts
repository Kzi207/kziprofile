import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testFormatUrls() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  console.log("Fetching info for video:", videoId);
  const info = await yt.getInfo(videoId);

  console.log("Title:", info.basic_info.title);

  // Check adaptive formats (audio)
  const audioFormats = info.streaming_data?.adaptive_formats.filter(f => f.has_audio && !f.has_video) || [];
  console.log(`Found ${audioFormats.length} audio adaptive formats.`);

  for (let i = 0; i < audioFormats.length; i++) {
    const fmt = audioFormats[i];
    console.log(`\nFormat #${i + 1}: itag=${fmt.itag}, mimeType=${fmt.mime_type}, bitrate=${fmt.bitrate}`);
    try {
      // Try deciphering URL
      const url = fmt.decipher(yt.session.player);
      console.log("Deciphered URL:", url ? url.slice(0, 100) + "..." : "NONE");

      if (url) {
        console.log("Testing fetch from deciphered URL...");
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.youtube.com/"
          }
        });
        console.log("Fetch status:", res.status, res.statusText);
        const len = res.headers.get("content-length");
        console.log("Content length:", len);
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const { done, value } = await reader.read();
          console.log(`Read first chunk? done=${done}, bytes=${value?.length}`);
          if (!done && value && value.length > 0) {
            console.log(">>> SUCCESS! DIRECT STREAMING WORKS FOR THIS FORMAT!");
          }
        }
      }
    } catch (err: any) {
      console.log("Error deciphering format:", err.message);
    }
  }
}

testFormatUrls().catch(console.error);
