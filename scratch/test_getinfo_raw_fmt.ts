import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testGetInfoRawFmt() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);
  const audioFormats = info.streaming_data?.adaptive_formats.filter(f => f.has_audio && !f.has_video) || [];

  console.log(`Found ${audioFormats.length} audio formats.`);
  for (let i = 0; i < audioFormats.length; i++) {
    const fmt = audioFormats[i];
    console.log(`\n--- Audio Format #${i + 1} (itag ${fmt.itag}) ---`);
    console.log("fmt.signature_cipher:", (fmt as any).signature_cipher || (fmt as any).signatureCipher);
    console.log("fmt.cipher:", (fmt as any).cipher);
    console.log("fmt.url:", fmt.url);
  }
}

testGetInfoRawFmt().catch(console.error);
