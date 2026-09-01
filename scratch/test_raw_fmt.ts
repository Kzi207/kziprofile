import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testRawFmt() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getBasicInfo(videoId);
  const rawFormat = (info.streaming_data?.adaptive_formats || [])[0];

  console.log("Raw Format object keys:", Object.keys(rawFormat));
  console.log("Raw Format JSON:", JSON.stringify(rawFormat, null, 2));
}

testRawFmt().catch(console.error);
