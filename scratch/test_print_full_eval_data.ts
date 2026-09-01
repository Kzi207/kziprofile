import { Innertube, Platform, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

Platform.shim.eval = async (data: string, env: Record<string, any>) => {
  console.log("=== FULL DATA PASSED TO EVAL ===");
  console.log(data);
  console.log("=== ENV KEYS PASSED ===");
  console.log(Object.keys(env));
  throw new Error("STOP");
};

async function printData() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  await yt.download(videoId, { client: "YTMUSIC", type: "audio" });
}

printData().catch(() => {});
