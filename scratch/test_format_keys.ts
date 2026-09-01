import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testFormatKeys() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "ANDROID", "TV_EMBEDDED", "MWEB", "WEB"] as const;

  for (const client of clients) {
    console.log(`\n=== Testing yt.getBasicInfo with client: ${client} ===`);
    try {
      const info = await yt.getBasicInfo(videoId, client as any);
      const formats = (info as any).streaming_data?.adaptive_formats || (info as any).streaming_data?.formats || [];
      console.log(`Client ${client}: Total formats = ${formats.length}`);

      for (const fmt of formats) {
        const hasUrl = Boolean(fmt.url);
        const hasSigCipher = Boolean(fmt.signature_cipher || fmt.signatureCipher);
        const hasCipher = Boolean(fmt.cipher);
        console.log(`  itag=${fmt.itag}, mime=${fmt.mime_type || fmt.mimeType}, url=${hasUrl}, sigCipher=${hasSigCipher}, cipher=${hasCipher}`);

        if (hasUrl) {
          console.log(`  >>> FOUND DIRECT URL: ${fmt.url.slice(0, 80)}...`);
        }
      }
    } catch (err: any) {
      console.log(`Client ${client} error: ${err.message}`);
    }
  }
}

testFormatKeys().catch(console.error);
