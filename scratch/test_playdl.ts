import play from "play-dl";

async function testPlayDl() {
  const videoId = "boKJ5XDs_mY";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log("Testing play.stream with URL:", url);
  try {
    const stream = await play.stream(url, {
      quality: 2
    });

    console.log("play.stream succeeded!");
    console.log("Stream type:", stream.type);

    let totalBytes = 0;
    stream.stream.on("data", (chunk) => {
      totalBytes += chunk.length;
      console.log(`Received chunk: ${chunk.length} bytes (Total: ${totalBytes})`);
    });

    await new Promise((resolve, reject) => {
      stream.stream.on("end", () => {
        console.log(`Stream finished! Total bytes: ${totalBytes}`);
        resolve(true);
      });
      stream.stream.on("error", (err) => {
        console.error("Stream error:", err.message);
        reject(err);
      });
    });

    if (totalBytes > 100000) {
      console.log("🎉🎉🎉 PLAY-DL STREAMING WORKS 100% PERFECTLY! 🎉🎉🎉");
    }
  } catch (err: any) {
    console.error("play-dl failed:", err.message);
  }
}

testPlayDl().catch(console.error);
