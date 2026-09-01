import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testHlsManifest() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);
  const streamingData = (info as any).streaming_data;

  console.log("hls_manifest_url:", streamingData?.hls_manifest_url);
  console.log("dash_manifest_url:", streamingData?.dash_manifest_url);

  if (streamingData?.hls_manifest_url) {
    console.log("\nFetching HLS Manifest content...");
    const res = await fetch(streamingData.hls_manifest_url);
    console.log("HLS Manifest Fetch Status:", res.status, res.statusText);
    const m3u8Text = await res.text();
    console.log("M3U8 Content Sample:\n", m3u8Text.slice(0, 500));
  }
}

testHlsManifest().catch(console.error);
