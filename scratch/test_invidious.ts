async function testInvidious() {
  const videoId = "boKJ5XDs_mY";
  const instances = [
    `https://inv.tux.pizza/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://invidious.drgns.space/api/v1/videos/${videoId}`,
    `https://vid.puffyan.us/api/v1/videos/${videoId}`,
    `https://invidious.no-kill.it/api/v1/videos/${videoId}`,
    `https://invidious.flokinet.to/api/v1/videos/${videoId}`
  ];

  for (const url of instances) {
    console.log(`\nTesting Invidious instance: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json() as any;
        console.log("Title:", data.title);

        const adaptiveFormats = data.adaptiveFormats || [];
        console.log(`Found ${adaptiveFormats.length} adaptive formats.`);

        const audioFmts = adaptiveFormats.filter((f: any) => f.type?.includes("audio"));
        console.log(`Found ${audioFmts.length} audio formats.`);

        if (audioFmts.length > 0) {
          const topAudio = audioFmts[0];
          console.log("Top Audio Format:", topAudio.type, topAudio.bitrate);
          console.log("Audio Stream URL:", topAudio.url ? topAudio.url.slice(0, 100) + "..." : "NONE");

          if (topAudio.url) {
            console.log("\nTesting stream fetch from Invidious URL...");
            const audioRes = await fetch(topAudio.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://www.youtube.com/"
              }
            });
            console.log(`Audio Stream Fetch Status: ${audioRes.status} ${audioRes.statusText}`);
            console.log(`Content-Type: ${audioRes.headers.get("content-type")}`);
            console.log(`Content-Length: ${audioRes.headers.get("content-length")}`);

            if (audioRes.ok && audioRes.body) {
              const reader = audioRes.body.getReader();
              const { done, value } = await reader.read();
              console.log(`FIRST CHUNK READ: bytes=${value?.length}, done=${done}`);
              if (!done && value && value.length > 0) {
                console.log("🎉🎉🎉 INVIDIOUS API WORKS 100% PERFECTLY FOR STREAMING! 🎉🎉🎉");
                return;
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.log(`Failed: ${err.message}`);
    }
  }
}

testInvidious().catch(console.error);
