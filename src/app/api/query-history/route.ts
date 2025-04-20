import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET() {
  try {
    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const db = client.db("youtube_trends_assistant");

    const history = await db
      .collection("user_query_history")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(history);
  } catch (err: any) {
    console.error("❌ Error fetching query history:", err.message);
    return NextResponse.json({ error: "Failed to fetch query history" }, { status: 500 });
  }
}
