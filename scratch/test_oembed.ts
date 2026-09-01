async function testOembed() {
  const videoId = "boKJ5XDs_mY";
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  console.log(`Fetching YouTube oEmbed: ${oembedUrl}...`);
  const res = await fetch(oembedUrl);
  console.log("oEmbed HTTP Status:", res.status);

  if (res.ok) {
    const data = await res.json();
    console.log("Title:", data.title);
    console.log("Author Name:", data.author_name);
    console.log("Thumbnail:", data.thumbnail_url);
  }
}

testOembed().catch(console.error);
