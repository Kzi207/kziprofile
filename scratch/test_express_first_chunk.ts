import express from "express";
import { getYT, downloadYouTubeStream, cleanName } from "../api_dl/youtube.js";
import { Readable } from "stream";

const app = express();

app.get("/test-stream/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const yt = await getYT();
    console.log(`Getting downloadStream for ${videoId}...`);
    const webStream = await downloadYouTubeStream(yt, videoId, "audio");

    const reader = (webStream as any).getReader();
    console.log("Reading first chunk...");
    const { done, value } = await reader.read();

    if (done || !value || value.length === 0) {
      console.log("Stream gave empty first chunk!");
      return res.status(500).json({
        status: false,
        message: "Không thể lấy dữ liệu stream từ YouTube."
      });
    }

    console.log(`Received VALID first chunk of ${value.length} bytes!`);

    // Headers are only set AFTER valid data is confirmed!
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${videoId}.mp3"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200);

    // Send the first chunk
    res.write(value);

    // Convert remaining reader to Node Readable and pipe
    const remainingStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(value);
          }
        } catch (err) {
          this.destroy(err as Error);
        }
      }
    });

    remainingStream.pipe(res);

  } catch (err: any) {
    console.error("Route error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({
        status: false,
        message: "Lỗi tải YouTube: " + err.message
      });
    }
  }
});

const server = app.listen(3009, async () => {
  console.log("Test server running on port 3009");
  console.log("Testing request to http://localhost:3009/test-stream/boKJ5XDs_mY...");
  try {
    const response = await fetch("http://localhost:3009/test-stream/boKJ5XDs_mY");
    console.log("Response status:", response.status, response.statusText);
    console.log("Response Content-Type:", response.headers.get("content-type"));
    const text = await response.text();
    console.log("Response Body (Sample):", text.slice(0, 300));
  } catch (e: any) {
    console.log("Fetch error:", e.message);
  } finally {
    server.close();
  }
});
