import { getYT } from "../api_dl/youtube.js";

async function testFormats() {
  const yt = await getYT();
  const info = await yt.getInfo("BaRopiZaOSo");
  console.log("Formats count:", info.streaming_data?.formats?.length);
  console.log("Adaptive formats count:", info.streaming_data?.adaptive_formats?.length);
  
  const audioFormat = info.chooseFormat({ type: "audio", quality: "best" });
  console.log("Chosen audio format has url:", Boolean(audioFormat?.url));
  if (audioFormat?.url) {
    console.log("URL:", audioFormat.url);
  } else if (audioFormat) {
    const deciphered = await audioFormat.decipher(yt.session.player);
    console.log("Deciphered URL:", deciphered);
  }
  process.exit(0);
}

testFormats();
