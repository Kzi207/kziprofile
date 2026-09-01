import { Innertube, Platform, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

// Direct eval
Platform.shim.eval = async (data: string, env: Record<string, any> = {}) => {
  try {
    // Expose env vars to scope
    for (const [k, v] of Object.entries(env)) {
      (globalThis as any)[k] = v;
    }
    return eval(data);
  } catch (err: any) {
    console.error("Direct Eval Error:", err.message);
    throw err;
  }
};

async function testDirectEval() {
  console.log("Testing Innertube with Direct eval(data)...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["YTMUSIC", "MWEB", "ANDROID", "WEB", "IOS"] as const;

  for (const client of clients) {
    console.log(`\n========================================`);
    console.log(`Testing client with Direct eval: ${client}`);
    try {
      const downloadStream = await yt.download(videoId, {
        client: client as any,
        quality: "best",
        type: "audio"
      });

      const nodeStream = Readable.fromWeb(downloadStream as any);
      let bytes = 0;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log(`Client ${client} timeout waiting for data.`);
          resolve(false);
        }, 5000);

        nodeStream.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 30000) {
            console.log(`🎉🎉🎉 SUCCESS FOR CLIENT ${client}! Bytes read: ${bytes} 🎉🎉🎉`);
            clearTimeout(timeout);
            try { nodeStream.destroy(); } catch {}
            resolve(true);
          }
        });

        nodeStream.on("error", (err) => {
          console.log(`Client ${client} stream error: ${err.message}`);
          clearTimeout(timeout);
          resolve(false);
        });
      });

      if (bytes > 30000) {
        console.log(`\n🏆🏆🏆 WINNING CLIENT FOUND: ${client} 🏆🏆🏆`);
        return client;
      }
    } catch (err: any) {
      console.log(`Client ${client} failed: ${err.message}`);
    }
  }
}

testDirectEval().catch(console.error);
