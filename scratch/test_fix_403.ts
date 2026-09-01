import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

async function testFix403() {
  console.log("Testing YouTube stream with custom fetch / Innertube options...");

  // Test creating Innertube with custom fetch wrapper that adds YouTube headers
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true,
    fetch: async (input, init) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const headers = new Headers(init?.headers || {});

      if (urlStr.includes("googlevideo.com")) {
        if (!headers.has("User-Agent")) {
          headers.set("User-Agent", "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)");
        }
        if (!headers.has("Referer")) {
          headers.set("Referer", "https://www.youtube.com/");
        }
        if (!headers.has("Origin")) {
          headers.set("Origin", "https://www.youtube.com");
        }
      }

      return fetch(input, { ...init, headers });
    }
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED", "MWEB"] as const;

  for (const client of clients) {
    console.log(`\nTesting client: ${client}`);
    try {
      const downloadStream = await yt.download(videoId, {
        client,
        quality: "best",
        type: "audio"
      });

      const nodeStream = Readable.fromWeb(downloadStream as any);

      await new Promise((resolve, reject) => {
        let total = 0;
        nodeStream.on("data", (chunk) => {
          total += chunk.length;
          if (total > 50000) {
            console.log(`🎉 SUCCESS FOR CLIENT ${client}! Total bytes read = ${total}`);
            nodeStream.destroy();
            resolve(true);
          }
        });
        nodeStream.on("error", (err) => {
          console.log(`Client ${client} stream error: ${err.message}`);
          reject(err);
        });
      });
      break;
    } catch (err: any) {
      console.log(`Client ${client} failed.`);
    }
  }
}

testFix403().catch(console.error);
