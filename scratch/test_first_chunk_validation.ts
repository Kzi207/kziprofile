import { Innertube, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);

async function testFirstChunkValidation() {
  console.log("Initializing Innertube...");
  const yt = await Innertube.create({
    location: "VN",
    retrieve_player: true
  });

  const videoId = "boKJ5XDs_mY";
  const clients = ["IOS", "ANDROID", "WEB", "YTMUSIC", "MWEB"] as const;

  let validStreamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let firstChunk: Uint8Array | null = null;
  let successfulClient = "";

  for (const client of clients) {
    console.log(`Trying client ${client}...`);
    try {
      const stream = await yt.download(videoId, {
        client: client as any,
        quality: "best",
        type: "audio"
      });

      const reader = stream.getReader();
      const { done, value } = await reader.read();

      if (!done && value && value.length > 0) {
        console.log(`🎉 SUCCESS! Client ${client} provided valid first chunk of ${value.length} bytes!`);
        validStreamReader = reader;
        firstChunk = value;
        successfulClient = client;
        break;
      } else {
        console.log(`Client ${client} returned empty first chunk.`);
      }
    } catch (err: any) {
      console.log(`Client ${client} failed: ${err.message}`);
    }
  }

  if (firstChunk && validStreamReader) {
    console.log(`\nVerified valid YouTube stream from ${successfulClient}! Ready to pipe to client response!`);
  } else {
    console.log("\nAll Innertube clients failed to produce valid initial bytes.");
  }
}

testFirstChunkValidation().catch(console.error);
