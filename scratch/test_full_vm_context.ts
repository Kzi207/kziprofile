import { Innertube, Platform, Log } from "youtubei.js";
import vm from "vm";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

Platform.shim.eval = async (data: string, env: Record<string, any>) => {
  try {
    const sandbox = {
      Object,
      Array,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      Math,
      Date,
      decodeURIComponent,
      encodeURIComponent,
      atob,
      btoa,
      console,
      ...env
    };
    const context = vm.createContext(sandbox);
    const codeToRun = `(function() {\n${data}\n})()`;
    return vm.runInContext(codeToRun, context);
  } catch (err: any) {
    console.error("Full Sandbox VM Eval Error:", err.message);
    throw err;
  }
};

async function testFullVmContext() {
  console.log("Testing Innertube with Full Sandbox VM Eval...");
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
        nodeStream.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 30000) {
            console.log(`🎉🎉🎉 SUCCESS FOR CLIENT ${client}! Bytes read: ${bytes} 🎉🎉🎉`);
            try { nodeStream.destroy(); } catch {}
            resolve(true);
          }
        });

        nodeStream.on("error", (err) => {
          console.log(`Client ${client} stream error: ${err.message}`);
          reject(err);
        });
      });

      console.log(`\n🏆🏆🏆 WINNING CLIENT FOUND: ${client} 🏆🏆🏆`);
      return client;
    } catch (err: any) {
      console.log(`Client ${client} failed: ${err.message}`);
    }
  }
}

testFullVmContext().catch(console.error);
