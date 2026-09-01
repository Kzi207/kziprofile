import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testDecipherUrl() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);

  console.log("Chosen format:");
  const audioFmt = info.chooseFormat({ type: "audio", quality: "best" });
  console.log("itag:", audioFmt.itag, "mime:", audioFmt.mime_type);

  // AWAIT deciphering!
  const url = await audioFmt.decipher(yt.session.player);
  console.log("\nDeciphered URL successfully!");
  console.log("URL:", url);

  // Now test fetching the deciphered URL directly!
  console.log("\nFetching stream from deciphered URL directly...");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.youtube.com/"
    }
  });

  console.log("Fetch Status:", res.status, res.statusText);
  console.log("Content-Type:", res.headers.get("content-type"));
  console.log("Content-Length:", res.headers.get("content-length"));

  if (res.ok && res.body) {
    const reader = res.body.getReader();
    const { done, value } = await reader.read();
    console.log(`First chunk read: done=${done}, bytes=${value?.length}`);
    if (value && value.length > 0) {
      console.log("🎉 SUCCESS! WE FOUND THE SOLUTION! DIRECT STREAMING WORKS PERFECTLY!");
    }
  }
}

testDecipherUrl().catch(console.error);
