import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testDecipherTv() {
  const yt = await Innertube.create({
    location: "US",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const infoTv = await yt.getInfo(videoId, "TV_EMBEDDED");
  const audioFormat = infoTv.chooseFormat({ type: "audio", quality: "best" });

  console.log("Chosen audio format itag:", audioFormat.itag);
  console.log("has url?", Boolean(audioFormat.url));
  console.log("has signature_cipher?", Boolean((audioFormat as any).signature_cipher));

  try {
    console.log("Attempting audioFormat.decipher(yt.session.player)...");
    const decipheredUrl = await audioFormat.decipher(yt.session.player);
    console.log("Deciphered URL:", decipheredUrl ? decipheredUrl.slice(0, 100) + "..." : "NONE");

    if (decipheredUrl) {
      console.log("Testing fetch from deciphered URL...");
      const res = await fetch(decipheredUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.youtube.com/"
        }
      });
      console.log(`Fetch status: ${res.status} ${res.statusText}`);
      console.log(`Content-Length: ${res.headers.get("content-length")}`);
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const { done, value } = await reader.read();
        console.log(`FIRST CHUNK READ: bytes=${value?.length}, done=${done}`);
        if (!done && value && value.length > 0) {
          console.log("🎉🎉🎉 TV_EMBEDDED DECIPHER WORKED 100%! 🎉🎉🎉");
        }
      }
    }
  } catch (err: any) {
    console.log("Decipher error:", err.message);
  }
}

testDecipherTv().catch(console.error);
