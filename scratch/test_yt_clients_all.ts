import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testAll() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "TV_EMBEDDED", "ANDROID", "WEB", "YTMUSIC"] as const;

  for (const client of clients) {
    try {
      console.log(`Testing client ${client}...`);
      const stream = await yt.download(videoId, {
        client: client,
        quality: "best",
        type: "audio"
      });
      console.log(`Client ${client} WORKS!`);
    } catch (err: any) {
      console.log(`Client ${client} FAILED: ${err.message}`);
    }
  }
}

testAll();
