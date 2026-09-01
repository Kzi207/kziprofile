import { Innertube, Platform, Log } from "youtubei.js";
import vm from "vm";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

Platform.shim.eval = async (data: string, env: Record<string, any> = {}) => {
  try {
    const sandbox = {
      g: {},
      window: {},
      self: {},
      document: {},
      location: { href: "https://www.youtube.com" },
      navigator: { userAgent: "Mozilla/5.0" },
      console,
      Math,
      Date,
      RegExp,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Error,
      parseInt,
      parseFloat,
      decodeURIComponent,
      encodeURIComponent,
      btoa,
      atob,
      ...env
    };

    const context = vm.createContext(sandbox);
    return vm.runInContext(data, context);
  } catch (err: any) {
    console.error("Eval Error:", err.message);
    throw err;
  }
};

async function testCorrectEval() {
  console.log("Testing Innertube with correct VM Platform.shim.eval...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["YTMUSIC", "MWEB", "ANDROID", "WEB", "IOS"] as const;

  for (const client of clients) {
    console.log(`\n========================================`);
    console.log(`Testing client with correct VM eval: ${client}`);
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

testCorrectEval().catch(console.error);
