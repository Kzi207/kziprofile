import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

async function testAllInnertubeClients() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = [
    "WEB",
    "ANDROID",
    "IOS",
    "TV",
    "TV_EMBEDDED",
    "YTMUSIC",
    "MWEB",
    "WEB_KIDS",
    "WEB_EMBEDDED"
  ] as const;

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

      let bytesReceived = 0;
      let streamOk = false;

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`Client ${client} TIMEOUT waiting for data.`);
          resolve(false);
        }, 5000);

        nodeStream.on("data", (chunk) => {
          bytesReceived += chunk.length;
          if (bytesReceived > 10000) {
            console.log(`🎉🎉🎉 WORKING! Client ${client} received ${bytesReceived} bytes! 🎉🎉🎉`);
            streamOk = true;
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

      if (streamOk) {
        console.log(`>>> SUCCESSFUL CLIENT FOUND: ${client} <<<`);
        return client;
      }
    } catch (err: any) {
      console.log(`Client ${client} thrown error: ${err.message}`);
    }
  }

  console.log("\nAll clients failed.");
}

testAllInnertubeClients().catch(console.error);
