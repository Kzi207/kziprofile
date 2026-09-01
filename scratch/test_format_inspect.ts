import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function inspectFormats() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);

  console.log("chooseFormat audio:");
  try {
    const audioFmt = info.chooseFormat({ type: "audio", quality: "best" });
    console.log("Chosen audio format itag:", audioFmt.itag, "mimeType:", audioFmt.mime_type);
    console.log("has url property?", Boolean(audioFmt.url));
    console.log("has signature_cipher?", Boolean((audioFmt as any).signature_cipher));
    console.log("has cipher?", Boolean((audioFmt as any).cipher));

    // Try deciphering through format.decipher
    const url = audioFmt.decipher(yt.session.player);
    console.log("Deciphered URL:", url);
  } catch (err: any) {
    console.log("chooseFormat error:", err.stack);
  }
}

inspectFormats().catch(console.error);
