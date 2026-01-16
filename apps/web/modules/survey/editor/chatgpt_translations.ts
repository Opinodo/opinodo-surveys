import OpenAI from "openai";

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

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "You are a translation engine. Return ONLY valid JSON. No markdown. No explanations.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
  });

  const output = response.output_text;

  if (!output) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(output);
}
