import play from "play-dl";

async function testPlayDlInfo() {
  const url = "https://www.youtube.com/watch?v=boKJ5XDs_mY";
  console.log("Checking play.yt_validate:", play.yt_validate(url));

  try {
    console.log("Fetching video info...");
    const info = await play.video_info(url);
    console.log("Title:", info.video_details.title);
    console.log("Duration:", info.video_details.durationInSec);

    console.log("Getting stream from info...");
    const stream = await play.stream_from_info(info, { quality: 2 });
    console.log("Stream type:", stream.type);

    let totalBytes = 0;
    stream.stream.on("data", (chunk) => {
      totalBytes += chunk.length;
    });

    await new Promise((resolve) => {
      stream.stream.on("data", () => {
        if (totalBytes > 100000) {
          console.log(`Stream is flowing! Bytes read so far: ${totalBytes}`);
          resolve(true);
        }
      });
      stream.stream.on("error", (err) => {
        console.error("Stream error:", err.message);
        resolve(false);
      });
    });

    if (totalBytes > 100000) {
      console.log("🎉🎉🎉 PLAY-DL STREAM FROM INFO WORKS 100% PERFECTLY! 🎉🎉🎉");
    }
  } catch (err: any) {
    console.error("play.video_info failed:", err.message);
  }
}

testPlayDlInfo().catch(console.error);
