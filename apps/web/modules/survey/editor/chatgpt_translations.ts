import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateWithChatGPT(
  targetLanguageCode: string,
  texts: { [key: string]: string }
): Promise<{ [key: string]: string }> {
  const prompt =
    `Translate the following English phrases to ${targetLanguageCode}. Return ONLY the translations as a JSON object, keeping the original keys.` +
    `\n\n${JSON.stringify(texts, null, 2)}`;

  try {
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

    if (!message) throw new Error("No translation response...");

    const jsonMatch = message.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : message;

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("OpenAI Translation Error:", error);
    throw error;
  }
}
