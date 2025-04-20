import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text, voiceId } = await req.json();

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v1",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new NextResponse(`Error from ElevenLabs: ${errText}`, { status: 500 });
  }

  // ✅ Pass through the audio stream directly
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
