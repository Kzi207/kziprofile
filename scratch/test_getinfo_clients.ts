import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testGetInfoClients() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED", "YTMUSIC"] as const;

  for (const client of clients) {
    try {
      console.log(`\nTesting yt.getInfo with client: ${client}`);
      const info = await yt.getInfo(videoId, client as any);
      const formats = info.streaming_data?.adaptive_formats || [];
      console.log(`Client ${client} returned ${formats.length} formats.`);

      for (const fmt of formats) {
        if (fmt.has_audio && !fmt.has_video) {
          console.log(`- Audio Format: itag=${fmt.itag}, mime=${fmt.mime_type}, url=${Boolean(fmt.url)}`);
          if (fmt.url) {
            console.log(`>>> DIRECT URL AVAILABLE for client ${client}: ${fmt.url.slice(0, 80)}...`);
            // Test fetch direct URL
            const res = await fetch(fmt.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.youtube.com/"
              }
            });
            console.log(`Fetch direct URL status: ${res.status} ${res.statusText}, Content-Length: ${res.headers.get("content-length")}`);
            if (res.ok && res.body) {
              const reader = res.body.getReader();
              const { done, value } = await reader.read();
              console.log(`FIRST CHUNK READ: bytes=${value?.length}, done=${done}`);
              if (!done && value && value.length > 0) {
                console.log(`🎉 BINGO! DIRECT URL WORKS FOR CLIENT ${client}!`);
                return;
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.log(`Client ${client} failed: ${err.message}`);
    }
  }
}

testGetInfoClients().catch(console.error);
