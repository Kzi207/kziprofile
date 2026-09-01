import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testFetchHeaders() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId, "IOS");

  // Get format
  const audioFmt = info.chooseFormat({ type: "audio", quality: "best" });
  console.log("Audio Format itag:", audioFmt.itag);

  // In youtubei.js FormatUtils, how does download get the URL?
  const downloadUrl = (audioFmt as any).url || (audioFmt as any).signature_cipher || (audioFmt as any).cipher;
  console.log("Raw downloadUrl or cipher:", downloadUrl ? downloadUrl.slice(0, 100) : "NONE");

  // Let's test calling yt.download and inspecting its session fetch headers
  console.log("yt.session.http headers:", (yt.session as any).http?.headers);

  // Let's test custom fetch with iOS User Agent to googlevideo.com URL:
  const infoUrl = (audioFmt as any).url;
  if (infoUrl) {
    const userAgents = [
      "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ];

    for (const ua of userAgents) {
      console.log(`\nTesting fetch with UA: ${ua.slice(0, 40)}...`);
      const res = await fetch(infoUrl, {
        headers: {
          "User-Agent": ua,
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Origin": "https://www.youtube.com",
          "Referer": "https://www.youtube.com/"
        }
      });
      console.log(`Res status: ${res.status} ${res.statusText}, Content-Length: ${res.headers.get("content-length")}`);
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const { done, value } = await reader.read();
        console.log(`CHUNK READ: done=${done}, bytes=${value?.length}`);
      }
    }
  }
}

testFetchHeaders().catch(console.error);
