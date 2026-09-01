import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testFormatUrlExtractor() {
  const yt = await Innertube.create({
    location: "US",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getBasicInfo(videoId);
  const formats = (info as any).streaming_data?.adaptive_formats || [];

  console.log(`Extracted ${formats.length} formats from getBasicInfo.`);
  for (const fmt of formats) {
    if (fmt.url) {
      console.log(`Found direct URL for itag ${fmt.itag}: ${fmt.url.slice(0, 100)}...`);
    }
  }

  // Check if getInfo with client WEB_EMBEDDED or TV has formats
  try {
    const infoTv = await yt.getInfo(videoId, "TV_EMBEDDED");
    const formatsTv = infoTv.streaming_data?.adaptive_formats || [];
    console.log(`Extracted ${formatsTv.length} formats from getInfo(TV_EMBEDDED).`);
    for (const fmt of formatsTv) {
      if (fmt.url) {
        console.log(`TV_EMBEDDED itag ${fmt.itag} URL: ${fmt.url.slice(0, 100)}...`);
      }
    }
  } catch (err: any) {
    console.log("getInfo(TV_EMBEDDED) error:", err.message);
  }
}

testFormatUrlExtractor().catch(console.error);
