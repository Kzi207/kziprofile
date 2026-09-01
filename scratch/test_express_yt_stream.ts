import { getYT, downloadYouTubeStream } from "../api_dl/youtube.js";
import { Readable } from "stream";

async function testYouTubeStreamPipe() {
  console.log("Initializing Innertube...");
  const yt = await getYT();

  const videoId = "boKJ5XDs_mY";
  console.log("Calling downloadYouTubeStream for ID:", videoId);

  try {
    const webStream = await downloadYouTubeStream(yt, videoId, "audio");
    console.log("webStream obtained! Converting to Node Readable stream...");
    const nodeStream = Readable.fromWeb(webStream as any);

    let totalBytes = 0;
    nodeStream.on("data", (chunk) => {
      totalBytes += chunk.length;
      console.log(`Received chunk: ${chunk.length} bytes (Total: ${totalBytes})`);
    });

    nodeStream.on("end", () => {
      console.log(`Stream ENDED! Total bytes received: ${totalBytes}`);
    });

    nodeStream.on("error", (err) => {
      console.error("Stream ERROR:", err);
    });

  } catch (err: any) {
    console.error("downloadYouTubeStream failed:", err.message);
  }
}

testYouTubeStreamPipe().catch(console.error);
