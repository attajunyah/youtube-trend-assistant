// /lib/mistral.ts
import axios from "axios";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export async function queryMistral(prompt: string) {
  const response = await axios.post(
    MISTRAL_API_URL,
    {
      model: "mistral-large-latest",
      messages: [{ role: "user", content: prompt }]
    },
    {
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}
