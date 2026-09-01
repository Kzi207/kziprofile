import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testFastInit() {
  console.time("Innertube create with retrieve_player: false");
  const ytFast = await Innertube.create({
    location: "VN",
    retrieve_player: false
  });
  console.timeEnd("Innertube create with retrieve_player: false");

  console.time("Search with fast yt instance");
  const searchRes = await ytFast.search("Sơn Tùng M-TP", { type: "video" });
  console.timeEnd("Search with fast yt instance");
  console.log(`Found ${searchRes.videos?.length} videos!`);

  console.time("getBasicInfo with fast yt instance");
  const info = await ytFast.getBasicInfo("boKJ5XDs_mY");
  console.timeEnd("getBasicInfo with fast yt instance");
  console.log("Title:", info.basic_info.title);
}

testFastInit().catch(console.error);
