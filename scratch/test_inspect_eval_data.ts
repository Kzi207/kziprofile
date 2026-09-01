import { Innertube, Platform, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

Platform.shim.eval = async (data: string, env: Record<string, any>) => {
  console.log("=== DATA PASSED TO EVAL ===");
  console.log(data.slice(0, 500));
  console.log("=== END DATA ===");
  throw new Error("STOP");
};

async function inspectEvalData() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  await yt.download(videoId, { client: "YTMUSIC", type: "audio" });
}

inspectEvalData().catch(() => {});
