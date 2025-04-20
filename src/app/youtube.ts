export async function fetchTrendingVideos({ region = "US", count = 10 }) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=${count}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items || [];
}
