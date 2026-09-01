import { Innertube, Log } from "youtubei.js";
import Jinter from "jinter";

Log.setLevel(Log.Level.NONE);

async function testJinter() {
  console.log("Testing Innertube with Jinter...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "ANDROID", "WEB"] as const;

  for (const client of clients) {
    try {
      console.log(`Downloading with ${client}...`);
      const stream = await yt.download(videoId, {
        client,
        quality: "best",
        type: "audio"
      });
      console.log(`SUCCESS with ${client}! Stream is valid.`);
    } catch (err: any) {
      console.log(`FAILED with ${client}:`, err.message);
    }
  }
}

testJinter().catch(console.error);
