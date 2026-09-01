async function testPipedApi() {
  const videoId = "boKJ5XDs_mY";
  const instances = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://api.piped.video/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
    `https://api.vibe.sh/streams/${videoId}`
  ];

  for (const url of instances) {
    console.log(`\nTesting Piped instance: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json() as any;
        console.log("Title:", data.title);
        console.log("Audio Streams Count:", data.audioStreams?.length);
        if (data.audioStreams && data.audioStreams.length > 0) {
          const topAudio = data.audioStreams[0];
          console.log("Top Audio Format:", topAudio.mimeType, topAudio.quality);
          console.log("Audio Stream URL:", topAudio.url.slice(0, 100) + "...");

          // Test streaming from audio URL
          console.log("Testing stream fetch from Audio Stream URL...");
          const audioRes = await fetch(topAudio.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              "Referer": "https://www.youtube.com/"
            }
          });
          console.log(`Audio Stream Fetch Status: ${audioRes.status} ${audioRes.statusText}`);
          console.log(`Content-Length: ${audioRes.headers.get("content-length")}`);
          if (audioRes.ok && audioRes.body) {
            const reader = audioRes.body.getReader();
            const { done, value } = await reader.read();
            console.log(`FIRST CHUNK READ: bytes=${value?.length}, done=${done}`);
            if (!done && value && value.length > 0) {
              console.log("🎉🎉🎉 PIPED API WORKS 100% PERFECTLY FOR STREAMING! 🎉🎉🎉");
              return;
            }
          }
        }
      }
    } catch (err: any) {
      console.log(`Failed: ${err.message}`);
    }
  }
}

testPipedApi().catch(console.error);
