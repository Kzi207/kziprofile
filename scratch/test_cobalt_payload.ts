async function testCobaltV10() {
  const ytUrl = "https://www.youtube.com/watch?v=boKJ5XDs_mY";
  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: ytUrl,
      downloadMode: "audio"
    })
  });

  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Body:", text);
}

testCobaltV10().catch(console.error);
