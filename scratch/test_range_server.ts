import express from "express";
import { getYT } from "../api_dl/youtube.js";
import { Readable } from "stream";
import { spawn } from "child_process";

const app = express();

app.get("/test-stream", async (req, res) => {
  const videoId = "BaRopiZaOSo"; // 46-min video
  const yt = await getYT();
  const info = await yt.getBasicInfo(videoId);
  const durationSec = info.basic_info.duration || 0;

  const range = req.headers.range;
  const totalSize = Math.round(durationSec * 24000);

  let start = 0;
  let end = totalSize - 1;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    start = parseInt(parts[0], 10) || 0;
    if (parts[1]) end = parseInt(parts[1], 10);
  }

  const seekSeconds = Math.floor(start / 24000);
  console.log(`Parsed start: ${start}, end: ${end}, totalSize: ${totalSize}, seekSeconds: ${seekSeconds}`);

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");

  if (range) {
    const chunkSize = (end - start) + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    res.setHeader("Content-Length", chunkSize.toString());
  } else if (totalSize > 0) {
    res.setHeader("Content-Length", totalSize.toString());
  }

  const downloadStream = await yt.download(videoId, {
    client: "ANDROID",
    quality: "best"
  });

  const nodeStream = Readable.fromWeb(downloadStream as any);

  const ffmpegArgs: string[] = ["-fflags", "+genpts+discardcorrupt"];
  if (seekSeconds > 0) {
    ffmpegArgs.push("-ss", seekSeconds.toString());
  }
  ffmpegArgs.push(
    "-i", "pipe:0",
    "-vn",
    "-acodec", "libmp3lame",
    "-ab", "192k",
    "-ar", "44100",
    "-f", "mp3",
    "pipe:1"
  );

  const ffmpegProc = spawn("ffmpeg", ffmpegArgs);
  ffmpegProc.stdin.on("error", () => {});
  ffmpegProc.stdout.on("error", () => {});

  nodeStream.pipe(ffmpegProc.stdin);
  ffmpegProc.stdout.pipe(res);

  res.on("close", () => {
    try { nodeStream.destroy(); } catch {}
    try { ffmpegProc.kill(); } catch {}
  });
});

app.listen(3010, () => {
  console.log("Test server 3010 running");
});
