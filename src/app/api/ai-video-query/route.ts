import { NextResponse } from "next/server";
import { fetchTrendingVideos } from "@/app/youtube";
import { MongoClient } from "mongodb";

const categoryMap: Record<string, string> = {
  music: "10",
  gaming: "20",
  news: "25",
  "film & animation": "1",
  entertainment: "24",
  "howto & style": "26",
  sports: "17",
  science: "28",
  education: "27",
};

// 🔍 AI Summary Generator
async function generateAISummary(videos: any[]): Promise<string> {
  const titles = videos.map((v: any) => v.snippet?.title).slice(0, 10);

  const summaryPrompt = `
You are a YouTube trend analyst. Based on the following trending video titles, write a short, friendly summary highlighting key trends, artists, or themes.

Videos:
${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Make it clear, concise, and engaging.
`;

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: summaryPrompt }],
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "Summary unavailable.";
}

export async function POST(req: Request) {
  const { query } = await req.json();

  const prompt = `Interpret the following YouTube query and return a JSON object with:
  - region: 2-letter country code (e.g., "US")
  - count: number of results (e.g., 20)
  - timeframe: one of ["today", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year"]
  - category: YouTube category name (e.g., "Music", "Gaming", "News", "Film & Animation")

  Query:
  "${query}"

  Return only the JSON. Example:
  {
    "region": "US",
    "count": 20,
    "timeframe": "this_week",
    "category": "Music"
  }`;

  const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await mistralResponse.json();
  let content = data.choices?.[0]?.message?.content || "";

  const match = content.match(/```json\s*([\s\S]+?)\s*```/) || content.match(/```([\s\S]+?)```/);
  const jsonString = match ? match[1] : content;

  try {
    const parsed = JSON.parse(jsonString);

    const region = parsed.region || "US";
    const count = parsed.count || 10;
    const category = parsed.category?.toLowerCase() || null;
    const categoryId = categoryMap[category] || null;

    const allVideos = await fetchTrendingVideos({ region, count: 50 });

    const filtered = categoryId
      ? allVideos.filter((video: any) => video.snippet?.categoryId === categoryId)
      : allVideos;

    const results = filtered.slice(0, count);
    const notice =
      filtered.length < count
        ? `Only ${filtered.length} videos found for category '${parsed.category}'`
        : undefined;

    // 🧠 Generate AI summary
    const summary = await generateAISummary(results);

    // 📦 Store history in MongoDB Atlas
    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const db = client.db("youtube_trends_assistant");
    const historyCollection = db.collection("user_query_history");

    await historyCollection.insertOne({
      query: {
        region: parsed.region,
        count: parsed.count,
        timeframe: parsed.timeframe,
        category: parsed.category
      },
      summary,
      results: results.map((v: any) => ({
        id: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails.medium.url,
      })),
      createdAt: new Date(),
    });

    return NextResponse.json({
      query: parsed,
      results,
      summary,
      ...(notice && { notice })
    });

  } catch (err) {
    return NextResponse.json({ error: "Failed to parse response", raw: content }, { status: 500 });
  }
}
