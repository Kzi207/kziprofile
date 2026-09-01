import { getYT } from "../api_dl/youtube.js";
import { spawn } from "child_process";

async function testFastSeek(videoId: string, seekSeconds: number) {
  console.log(`\n--- Testing Direct URL Fast Seek to ${seekSeconds}s for video ${videoId} ---`);
  const startTime = Date.now();

  const yt = await getYT();
  const info = await yt.getInfo(videoId, { client: "ANDROID" });
  
  const format = info.chooseFormat({ type: "audio", quality: "best" }) || info.streaming_data?.adaptive_formats?.find((f: any) => f.has_audio);
  if (!format) {
    console.error("No format found!");
    return;
  }

  const decipheredUrl = await format.decipher(yt.session.player);
  console.log("Got deciphered direct URL in", Date.now() - startTime, "ms!");

  const ffmpegArgs: string[] = [];
  if (seekSeconds > 0) {
    ffmpegArgs.push("-ss", seekSeconds.toString());
  }
  ffmpegArgs.push(
    "-i", decipheredUrl,
    "-vn",
    "-acodec", "libmp3lame",
    "-ab", "192k",
    "-ar", "44100",
    "-f", "mp3",
    "pipe:1"
  );

  const ffmpegProc = spawn("ffmpeg", ffmpegArgs);

  let bytes = 0;
  ffmpegProc.stdout.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > 50000) {
      const elapsed = Date.now() - startTime;
      console.log(`🚀 INSTANT SEEK SUCCESS! Seeked 20 MINUTES into video in ${elapsed} ms! Received ${bytes} bytes!`);
      ffmpegProc.kill();
      process.exit(0);
    }
  });

  ffmpegProc.on("error", (e) => console.error("FFmpeg error:", e));
}

testFastSeek("BaRopiZaOSo", 1200); // Seek 20 minutes into 46-min video!
