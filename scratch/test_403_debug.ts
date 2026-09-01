import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function debug403() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["ANDROID", "IOS", "WEB", "TV_EMBEDDED", "YTMUSIC", "MWEB"] as const;

  for (const client of clients) {
    try {
      console.log(`\nTesting download with client: ${client}`);
      const stream = await yt.download(videoId, {
        client,
        quality: "best",
        type: "audio"
      });

      const reader = stream.getReader();
      const { done, value } = await reader.read();
      if (done) {
        console.log(`Client ${client}: Stream was IMMEDIATELY DONE (0 bytes!)`);
      } else {
        console.log(`Client ${client}: SUCCESS! First chunk size = ${value?.length} bytes`);
      }
    } catch (err: any) {
      console.log(`Client ${client}: FAILED with error: ${err.message}`);
    }
  }
}

debug403().catch(console.error);
