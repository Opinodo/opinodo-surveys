import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hardcoded translations for common button labels to avoid unnecessary API calls
const BUTTON_TRANSLATIONS: { [key: string]: { Next: string; Back: string } } = {
  ar: { Next: "التالي", Back: "رجوع" },
  bg: { Next: "Напред", Back: "Назад" },
  bs: { Next: "Sljedeće", Back: "Nazad" },
  cs: { Next: "Další", Back: "Zpět" },
  da: { Next: "Næste", Back: "Tilbage" },
  de: { Next: "Weiter", Back: "Zurück" },
  el: { Next: "Επόμενο", Back: "Πίσω" },
  en: { Next: "Next", Back: "Back" },
  es: { Next: "Siguiente", Back: "Atrás" },
  et: { Next: "Edasi", Back: "Tagasi" },
  fi: { Next: "Seuraava", Back: "Takaisin" },
  fr: { Next: "Suivant", Back: "Retour" },
  hi: { Next: "अगला", Back: "वापस" },
  hr: { Next: "Sljedeće", Back: "Natrag" },
  hu: { Next: "Következő", Back: "Vissza" },
  id: { Next: "Berikutnya", Back: "Kembali" },
  is: { Next: "Næsta", Back: "Til baka" },
  it: { Next: "Avanti", Back: "Indietro" },
  ja: { Next: "次へ", Back: "戻る" },
  ko: { Next: "다음", Back: "뒤로" },
  lt: { Next: "Kitas", Back: "Atgal" },
  lv: { Next: "Nākamais", Back: "Atpakaļ" },
  ms: { Next: "Seterusnya", Back: "Kembali" },
  nb: { Next: "Neste", Back: "Tilbake" },
  nl: { Next: "Volgende", Back: "Terug" },
  pl: { Next: "Dalej", Back: "Wstecz" },
  pt: { Next: "Próximo", Back: "Voltar" },
  ro: { Next: "Următorul", Back: "Înapoi" },
  ru: { Next: "Далее", Back: "Назад" },
  sk: { Next: "Ďalej", Back: "Späť" },
  sl: { Next: "Naprej", Back: "Nazaj" },
  sr: { Next: "Следеће", Back: "Назад" },
  sv: { Next: "Nästa", Back: "Tillbaka" },
  th: { Next: "ถัดไป", Back: "ย้อนกลับ" },
  tr: { Next: "İleri", Back: "Geri" },
  uk: { Next: "Далі", Back: "Назад" },
  uz: { Next: "Keyingisi", Back: "Orqaga" },
  vi: { Next: "Tiếp theo", Back: "Quay lại" },
  zh: { Next: "下一步", Back: "返回" },
  "zh-Hans": { Next: "下一步", Back: "返回" },
};

export async function translateTextMulti(
  targetLanguageCodes: string[],
  texts: { [key: string]: string }
): Promise<{ [languageCode: string]: { [key: string]: string } }> {
  // Filter out buttonLabel and backButtonLabel from texts to translate
  const textsToTranslate: { [key: string]: string } = {};
  const buttonLabels: { buttonLabel?: string; backButtonLabel?: string } = {};

  for (const [key, value] of Object.entries(texts)) {
    if (key === "buttonLabel" && (value === "Next" || value === "")) {
      buttonLabels.buttonLabel = "Next";
    } else if (key === "backButtonLabel" && (value === "Back" || value === "")) {
      buttonLabels.backButtonLabel = "Back";
    } else {
      textsToTranslate[key] = value;
    }
  }

  // If there's nothing left to translate, just return button translations
  if (Object.keys(textsToTranslate).length === 0) {
    const result: { [languageCode: string]: { [key: string]: string } } = {};
    for (const langCode of targetLanguageCodes) {
      result[langCode] = {};
      if (buttonLabels.buttonLabel && BUTTON_TRANSLATIONS[langCode]) {
        result[langCode].buttonLabel = BUTTON_TRANSLATIONS[langCode].Next;
      }
      if (buttonLabels.backButtonLabel && BUTTON_TRANSLATIONS[langCode]) {
        result[langCode].backButtonLabel = BUTTON_TRANSLATIONS[langCode].Back;
      }
    }
    return result;
  }

  const prompt = `
Translate the following English phrases into multiple languages.
Return ONLY the translations as a JSON object in the format:
{ "fr": { ... }, "es": { ... }, ... }

Use Cyrillic script for Serbian ("sr").

Phrases:
${JSON.stringify(textsToTranslate, null, 2)}

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

  const translationResult = JSON.parse(output);

  // Merge button translations back in
  for (const langCode of targetLanguageCodes) {
    if (!translationResult[langCode]) {
      translationResult[langCode] = {};
    }
    if (buttonLabels.buttonLabel && BUTTON_TRANSLATIONS[langCode]) {
      translationResult[langCode].buttonLabel = BUTTON_TRANSLATIONS[langCode].Next;
    }
    if (buttonLabels.backButtonLabel && BUTTON_TRANSLATIONS[langCode]) {
      translationResult[langCode].backButtonLabel = BUTTON_TRANSLATIONS[langCode].Back;
    }
  }

  return translationResult;
}
