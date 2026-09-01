import { getYT } from "../api_dl/youtube.js";

async function testDownloadOptions() {
  const yt = await getYT();
  const info = await yt.getInfo("BaRopiZaOSo", { client: "ANDROID" });
  
  const format = info.chooseFormat({ type: "audio", quality: "best" });
  if (format && yt.session.player) {
    const decipheredUrl = String(format.decipher(yt.session.player));
    console.log("🎉 Deciphered URL string successfully!\nURL:", decipheredUrl.slice(0, 100));
  }
  process.exit(0);
}

testDownloadOptions();
