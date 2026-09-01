import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function findCipher() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);

  // Print raw player response keys
  console.log("Player response keys:", Object.keys((info as any).page?.[0] || {}));
  const streamingData = (info as any).page?.[0]?.streamingData || (info as any).streaming_data;
  console.log("StreamingData keys:", Object.keys(streamingData || {}));

  const adaptiveFormats = streamingData?.adaptiveFormats || streamingData?.adaptive_formats || [];
  console.log(`AdaptiveFormats count: ${adaptiveFormats.length}`);
  if (adaptiveFormats.length > 0) {
    const firstAudio = adaptiveFormats.find((f: any) => f.mimeType?.includes("audio") || f.mime_type?.includes("audio"));
    console.log("\nFirst Audio Format Raw Object Keys:", Object.keys(firstAudio || {}));
    console.log("First Audio Format Raw Object:", JSON.stringify(firstAudio, null, 2));
  }
}

findCipher().catch(console.error);
