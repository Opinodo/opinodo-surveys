import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateTextMulti(
  targetLanguageCodes: string[],
  texts: { [key: string]: string }
): Promise<{ [languageCode: string]: { [key: string]: string } }> {
  const prompt = `
Translate the following English phrases into multiple languages.
Return ONLY the translations as a JSON object in the format:
{ "fr": { ... }, "es": { ... }, ... }

Use Cyrillic script for Serbian ("sr").

Phrases:
${JSON.stringify(texts, null, 2)}

Languages: ${targetLanguageCodes.join(", ")}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a professional translator. Keep translations accurate, natural-sounding, and preserve formatting.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  const message = response.choices[0].message.content;
  const jsonMatch = message?.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleanText = jsonMatch ? jsonMatch[1] : message;

  if (!cleanText) {
    throw new Error("Translation response was empty or not in JSON format.");
  }

  return JSON.parse(cleanText);
}
