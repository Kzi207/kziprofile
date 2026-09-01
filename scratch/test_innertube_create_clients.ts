import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testInnertubeCreateClients() {
  const clientTypes = ["WEB", "ANDROID", "IOS", "TV", "YTMUSIC"] as const;

  for (const clientType of clientTypes) {
    try {
      console.log(`\n=== Creating Innertube with clientType: ${clientType} ===`);
      const yt = await Innertube.create({
        location: "VN",
        retrieve_player: true,
        client_type: clientType as any
      });

      const videoId = "boKJ5XDs_mY";
      const info = await yt.getInfo(videoId);

      const format = info.chooseFormat({ type: "audio", quality: "best" });
      console.log(`Chosen format: itag=${format.itag}, mime=${format.mime_type}`);

      const decipheredUrl = await format.decipher(yt.session.player);
      console.log(`Deciphered URL success: ${decipheredUrl ? decipheredUrl.slice(0, 70) + "..." : "NONE"}`);

      if (decipheredUrl) {
        console.log("Testing fetch from deciphered URL...");
        const res = await fetch(decipheredUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": "https://www.youtube.com/"
          }
        });
        console.log(`Fetch status: ${res.status} ${res.statusText}`);
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const { done, value } = await reader.read();
          console.log(`Read first chunk: bytes=${value?.length}, done=${done}`);
          if (!done && value && value.length > 0) {
            console.log(`🎉🎉🎉 SUCCESS WITH client_type: ${clientType}! 🎉🎉🎉`);
            return;
          }
        }
      }
    } catch (err: any) {
      console.log(`Failed for clientType ${clientType}: ${err.message}`);
    }
  }
}

testInnertubeCreateClients().catch(console.error);
