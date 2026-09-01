import { Innertube, Platform, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

// Set native eval
Platform.shim.eval = async (data: string, env: Record<string, any> = {}) => {
  try {
    // Bind env keys to global scope or local scope before eval
    const keys = Object.keys(env);
    const values = Object.values(env);
    const fn = new Function(...keys, data);
    return fn(...values);
  } catch (err: any) {
    console.error("Native Eval Error:", err.message);
    throw err;
  }
};

async function testNativeEval() {
  console.log("Testing Innertube with Native eval...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["YTMUSIC", "MWEB", "ANDROID", "WEB", "IOS"] as const;

  for (const client of clients) {
    console.log(`\n========================================`);
    console.log(`Testing client: ${client}`);
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

testNativeEval().catch(console.error);
