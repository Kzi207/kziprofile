import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testClients() {
  console.log("Initializing Innertube...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  console.log("Getting basic info for video:", videoId);
  const info = await yt.getBasicInfo(videoId);
  console.log("Title:", info.basic_info.title);

  const clients = ["ANDROID", "IOS", "TV_EMBEDDED", "WEB"] as const;
  for (const client of clients) {
    try {
      console.log(`Testing client: ${client}...`);
      const stream = await yt.download(videoId, {
        client: client,
        quality: "best",
        type: "audio"
      });
      console.log(`Success with ${client}!`);
      break;
    } catch (err: any) {
      console.error(`Failed with ${client}:`, err.message);
    }
  }
}

testClients().catch(console.error);
