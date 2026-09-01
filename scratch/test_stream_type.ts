import { Innertube, Log } from "youtubei.js";
import { Readable } from "stream";

Log.setLevel(Log.Level.NONE);

async function testDownloadStreamType() {
  const yt = await Innertube.create({ location: "VN", retrieve_player: true });
  const videoId = "boKJ5XDs_mY";

  console.log("Downloading with IOS client...");
  const stream = await yt.download(videoId, {
    client: "IOS",
    quality: "best",
    type: "audio"
  });

  console.log("stream object type:", typeof stream, stream.constructor.name);
  console.log("is ReadableStream?", stream instanceof ReadableStream);
  console.log("is Node Readable?", stream instanceof Readable);

  // Read first chunk
  let nodeStream: Readable;
  if (stream instanceof Readable) {
    nodeStream = stream;
  } else if (typeof (stream as any).getReader === "function") {
    nodeStream = Readable.fromWeb(stream as any);
  } else {
    nodeStream = Readable.from(stream as any);
  }

  let totalBytes = 0;
  for await (const chunk of nodeStream) {
    totalBytes += chunk.length;
    console.log(`Received chunk of size ${chunk.length} bytes. Total so far: ${totalBytes}`);
    if (totalBytes > 100000) {
      console.log("Got enough data, stopping test.");
      break;
    }
  }
}

testDownloadStreamType().catch(console.error);
