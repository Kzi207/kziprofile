import express from "express";
import { streamYouTubeMedia, generateToken } from "../api_dl/youtube.js";

const app = express();

app.get("/test-stream/:id", async (req, res) => {
  console.log("Simulating streamYouTubeMedia call for:", req.params.id);
  await streamYouTubeMedia(req, res, req.params.id, "mp3");
});

const server = app.listen(3012, async () => {
  const videoId = "boKJ5XDs_mY";
  const expires = Date.now() + 15 * 60 * 1000;
  const token = generateToken(videoId, expires);
  const url = `http://localhost:3012/test-stream/${videoId}?expires=${expires}&token=${token}&dl=1`;

  console.log("Testing request to URL:", url);
  try {
    const res = await fetch(url);
    console.log("Fetch Status:", res.status, res.statusText);
    console.log("Content-Type:", res.headers.get("content-type"));
    if (res.ok) {
      const reader = res.body?.getReader();
      const { done, value } = await (reader?.read() || Promise.resolve({ done: true, value: null }));
      console.log(`🎉🎉🎉 STREAM DATA RECEIVED SUCCESSFULLY! First chunk bytes: ${value?.length} 🎉🎉🎉`);
    } else {
      console.log("Response text:", await res.text());
    }
  } catch (e: any) {
    console.error("Simulation error:", e.message);
  } finally {
    server.close();
  }
});
