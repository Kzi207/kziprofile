import { Innertube, Platform, Log } from "youtubei.js";
import vm from "vm";

Log.setLevel(Log.Level.NONE);

Platform.shim.eval = async (data: string, env: Record<string, any>) => {
  try {
    const context = vm.createContext({ ...env });
    return vm.runInContext(data, context);
  } catch (err: any) {
    console.error("VM Eval execution error:", err.message);
    throw err;
  }
};

async function testVerboseEval() {
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["ANDROID", "WEB", "YTMUSIC", "MWEB"] as const;

  for (const client of clients) {
    console.log(`\n--- Testing ${client} ---`);
    try {
      const stream = await yt.download(videoId, { client, type: "audio", quality: "best" });
      console.log(`yt.download(${client}) created stream object!`);
    } catch (err: any) {
      console.error(`yt.download(${client}) error:`, err.message);
    }
  }
}

testVerboseEval().catch(console.error);
