import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

async function testDownloadWithoutPlayer() {
  console.log("Creating Innertube with retrieve_player: false...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: false
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED"] as const;

  for (const client of clients) {
    console.log(`\nTesting download with client: ${client}`);
    try {
      const downloadStream = await yt.download(videoId, {
        client: client as any,
        type: "audio",
        quality: "best"
      });

      const reader = (downloadStream as any).getReader();
      const { done, value } = await reader.read();

      if (!done && value && value.length > 0) {
        console.log(`🎉🎉🎉 SUCCESS WITH CLIENT ${client}! Initial chunk: ${value.length} bytes 🎉🎉🎉`);
        return client;
      } else {
        console.log(`Client ${client} returned empty initial chunk.`);
      }
    } catch (err: any) {
      console.log(`Client ${client} error: ${err.message}`);
    }
  }
}

testDownloadWithoutPlayer().catch(console.error);
