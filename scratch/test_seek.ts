import { getYT } from "../api_dl/youtube.js";
import { Readable } from "stream";
import { spawn } from "child_process";

async function testSeek(seekSeconds: number) {
  console.log(`\n--- Testing FFmpeg -i pipe:0 -ss ${seekSeconds} seconds ---`);
  const yt = await getYT();

  const downloadStream = await yt.download("UXTavEdhCG4", {
    client: "ANDROID",
    quality: "best"
  });

  const nodeStream = Readable.fromWeb(downloadStream as any);

  const ffmpegArgs = [
    "-i", "pipe:0",
    "-ss", seekSeconds.toString(),
    "-vn",
    "-acodec", "libmp3lame",
    "-ab", "192k",
    "-ar", "44100",
    "-f", "mp3",
    "pipe:1"
  ];

  const ffmpegProc = spawn("ffmpeg", ffmpegArgs);
  nodeStream.pipe(ffmpegProc.stdin);

  ffmpegProc.stdin.on("error", () => {});
  ffmpegProc.stdout.on("error", () => {});

  let bytes = 0;
  ffmpegProc.stdout.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > 50000) {
      console.log(`🎉 SUCCESS! Output -ss ${seekSeconds}s instantly generated ${bytes} bytes of MP3 data!`);
      ffmpegProc.kill();
      nodeStream.destroy();
      process.exit(0);
    }
  });

  ffmpegProc.on("error", (e) => console.error("FFmpeg error:", e));
}

testSeek(300); // 5 minutes
