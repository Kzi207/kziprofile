async function testCobalt() {
  const videoId = "boKJ5XDs_mY";
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const instances = [
    "https://api.cobalt.tools",
    "https://cobalt-api.kwippy.com",
    "https://api.cobalt.766766.xyz",
    "https://cobalt.q1.30300.one",
    "https://co.wuk.sh"
  ];

  for (const instance of instances) {
    console.log(`\nTesting Cobalt instance: ${instance}`);
    try {
      const res = await fetch(instance, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: JSON.stringify({
          url: ytUrl,
          downloadMode: "audio",
          audioFormat: "mp3"
        })
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json() as any;
        console.log("Cobalt response:", JSON.stringify(data, null, 2));

        const streamUrl = data.url;
        if (streamUrl) {
          console.log("Testing stream fetch from Cobalt URL...");
          const streamRes = await fetch(streamUrl);
          console.log(`Stream Status: ${streamRes.status} ${streamRes.statusText}`);
          console.log(`Content-Length: ${streamRes.headers.get("content-length")}`);

          if (streamRes.ok && streamRes.body) {
            const reader = streamRes.body.getReader();
            const { done, value } = await reader.read();
            console.log(`FIRST CHUNK READ: bytes=${value?.length}, done=${done}`);
            if (!done && value && value.length > 0) {
              console.log("🎉🎉🎉 COBALT API WORKS 100% PERFECTLY! 🎉🎉🎉");
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

testCobalt().catch(console.error);
