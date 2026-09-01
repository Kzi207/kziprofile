import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testUserAgentFix() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";

  console.log("1. Fetching stream with IOS client...");
  try {
    const downloadStream = await yt.download(videoId, {
      client: "IOS",
      quality: "best",
      type: "audio"
    });

    console.log("downloadStream obtained successfully! Reading reader...");
    const reader = downloadStream.getReader();
    const { done, value } = await reader.read();
    console.log(`Read result: done=${done}, bytes=${value?.length}`);
    if (value && value.length > 0) {
      console.log("🎉 SUCCESS! IOS client stream gave non-zero bytes!");
    } else {
      console.log("Stream gave 0 bytes!");
    }
  } catch (err: any) {
    console.log("yt.download(IOS) error:", err);
  }
}

testUserAgentFix().catch(console.error);
