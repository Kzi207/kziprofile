import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function downloadYouTubeStream(yt: Innertube, videoId: string, type: "audio" | "video" | "video+audio" = "audio") {
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED", "YTMUSIC", "MWEB"] as const;
  let lastError: any = null;

  for (const client of clients) {
    try {
      console.log(`Trying YouTube client: ${client}...`);
      const stream = await yt.download(videoId, {
        client: client,
        quality: "best",
        type: type
      });
      console.log(`Successfully obtained stream using client: ${client}!`);
      return stream;
    } catch (err: any) {
      lastError = err;
      console.warn(`YouTube download failed with client ${client}: ${err.message}`);
    }
  }

  throw lastError || new Error("Không thể tải luồng media từ YouTube.");
}

async function run() {
  const yt = await Innertube.create({ location: "VN", retrieve_player: true });
  const stream = await downloadYouTubeStream(yt, "boKJ5XDs_mY", "audio");
  console.log("Stream is ready:", Boolean(stream));
}

run().catch(console.error);
