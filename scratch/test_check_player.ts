import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function checkPlayerInstance() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  console.log("yt.session.player exists?", Boolean(yt.session.player));
  console.log("yt.session.player:", yt.session.player);

  const videoId = "boKJ5XDs_mY";
  const info = await yt.getInfo(videoId);
  const audioFmt = info.chooseFormat({ type: "audio", quality: "best" });

  console.log("\nDeciphering audio format with yt.session.player...");
  try {
    const url = await audioFmt.decipher(yt.session.player);
    console.log("Deciphered URL:", url);
  } catch (err: any) {
    console.log("Error deciphering:", err.message);
  }
}

checkPlayerInstance().catch(console.error);
