import { Innertube, Platform, Log } from "youtubei.js";
import Jinter from "jinter";
import vm from "vm";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

// Test VM-based eval vs Jinter-based eval for Platform.shim.eval
Platform.shim.eval = async (data: string, env: Record<string, any>) => {
  // Using Node vm to evaluate the decipher script safely
  const context = vm.createContext({ ...env });
  return vm.runInContext(data, context);
};

async function testPlatformEval() {
  console.log("Platform.shim.eval configured with Node vm!");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["ANDROID", "WEB", "YTMUSIC", "MWEB", "IOS"] as const;

  for (const client of clients) {
    console.log(`\nTesting client with VM eval: ${client}`);
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
          if (bytes > 20000) {
            console.log(`🎉 SUCCESS FOR CLIENT ${client}! Bytes read: ${bytes}`);
            nodeStream.destroy();
            resolve(true);
          }
        });

        nodeStream.on("error", (err) => {
          console.log(`Client ${client} error: ${err.message}`);
          reject(err);
        });
      });

      console.log(`\n🏆 WINNER CLIENT: ${client} 🏆`);
      return;
    } catch (err: any) {
      console.log(`Client ${client} failed.`);
    }
  }
}

testPlatformEval().catch(console.error);
