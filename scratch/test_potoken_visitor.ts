import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testVisitorData() {
  console.log("Creating Innertube instance...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";

  // Check visitor_data
  console.log("Visitor Data:", yt.session.context.client.visitorData);

  // Try getInfo with visitorData intact
  const info = await yt.getInfo(videoId);

  console.log("\nInfo title:", info.basic_info.title);

  // Let's check streaming_data formats raw JSON
  const rawData = (info as any).page?.[0]?.streamingData;
  console.log("Raw streamingData exists?", Boolean(rawData));

  // Let's test if yt.download works when we DON'T override client (default client)
  console.log("\nTesting yt.download(videoId) default client...");
  try {
    const stream = await yt.download(videoId, {
      type: "audio",
      quality: "best"
    });
    const reader = stream.getReader();
    const { done, value } = await reader.read();
    console.log(`Default yt.download -> done=${done}, bytes=${value?.length}`);
    if (value && value.length > 0) {
      console.log("🎉 DEFAULT YT.DOWNLOAD WORKED!");
    }
  } catch (err: any) {
    console.log("Default yt.download failed:", err.message);
  }
}

testVisitorData().catch(console.error);
