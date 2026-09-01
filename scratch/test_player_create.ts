import { Innertube, Log } from "youtubei.js";
import Player from "youtubei.js/dist/src/core/Player.js";

Log.setLevel(Log.Level.NONE);

async function testPlayerCreate() {
  console.log("Fetching player_id from YouTube...");
  const player = await Player.create(null as any);
  console.log("Extracted player_id:", player.player_id);
  console.log("Extracted signature_timestamp:", player.signature_timestamp);
  console.log("Extracted nsigFunction:", player.data?.exportedRawValues?.nsigFunction);

  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);
  const format = info.chooseFormat({ type: "audio", quality: "best" });

  console.log("\nDeciphering URL with extracted Player instance...");
  try {
    const decipheredUrl = await player.decipher(format.url, (format as any).signature_cipher, (format as any).cipher, null as any);
    console.log("Deciphered URL result:", decipheredUrl);

    if (decipheredUrl) {
      console.log("Testing fetch from deciphered URL...");
      const res = await fetch(decipheredUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.youtube.com/"
        }
      });
      console.log("Fetch status:", res.status, res.statusText);
      console.log("Content-Length:", res.headers.get("content-length"));

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const { done, value } = await reader.read();
        console.log(`FIRST CHUNK READ: done=${done}, bytes=${value?.length}`);
      }
    }
  } catch (err: any) {
    console.log("Player decipher error:", err.message);
  }
}

testPlayerCreate().catch(console.error);
