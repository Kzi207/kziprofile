import ytdl from "@distube/ytdl-core";

async function testYtdlCore() {
  const videoId = "boKJ5XDs_mY";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log("Fetching info via @distube/ytdl-core for URL:", url);
  const info = await ytdl.getInfo(url);
  console.log("Title:", info.videoDetails.title);
  console.log("Author:", info.videoDetails.author.name);
  console.log("Duration (s):", info.videoDetails.lengthSeconds);

  // Filter audio formats
  const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
  console.log(`Found ${audioFormats.length} audioonly formats.`);

  if (audioFormats.length > 0) {
    const topAudio = audioFormats[0];
    console.log("Top Audio Format itag:", topAudio.itag, "mimeType:", topAudio.mimeType, "has url?", Boolean(topAudio.url));
    console.log("Top Audio URL sample:", topAudio.url ? topAudio.url.slice(0, 100) + "..." : "NONE");

    if (topAudio.url) {
      console.log("\nTesting fetch of direct audio stream URL from @distube/ytdl-core...");
      const res = await fetch(topAudio.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.youtube.com/"
        }
      });
      console.log(`Stream Fetch Status: ${res.status} ${res.statusText}`);
      console.log(`Content-Type: ${res.headers.get("content-type")}`);
      console.log(`Content-Length: ${res.headers.get("content-length")}`);

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const { done, value } = await reader.read();
        console.log(`CHUNK READ: done=${done}, bytes=${value?.length}`);
        if (!done && value && value.length > 0) {
          console.log("\n🎉🎉🎉 AMAZING SUCCESS! @distube/ytdl-core PROVIDES WORKING DIRECT STREAMING URLs! 🎉🎉🎉");
        }
      }
    }
  }

  // Also test ytdl(url, { filter: 'audioonly' }) stream
  console.log("\nTesting ytdl(url) stream pipe directly...");
  const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
  let totalBytes = 0;
  for await (const chunk of stream) {
    totalBytes += chunk.length;
    console.log(`Stream chunk received: ${chunk.length} bytes, Total: ${totalBytes}`);
    if (totalBytes > 100000) {
      console.log("ytdl stream pipe works perfectly!");
      break;
    }
  }
}

testYtdlCore().catch(console.error);
