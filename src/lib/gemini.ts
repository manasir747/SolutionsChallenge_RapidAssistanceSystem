const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

export async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("[Gemini] Missing GEMINI_API_KEY environment variable");
    throw new Error("Set GEMINI_API_KEY in .env.local");
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  console.info("[Gemini] Sending request", {
    promptPreview: prompt.slice(0, 80)
  });

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const rawBody = await response.text();

  if (!response.ok) {
    console.error(`[Gemini] API error ${response.status}`, rawBody);
    throw new Error(`Gemini error: ${response.status}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch (parseErr) {
    console.error("[Gemini] Failed to parse response JSON", parseErr);
    throw new Error("Gemini returned malformed JSON");
  }

  const text = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.warn("[Gemini] Response did not include text", data);
  }

  return text ?? "Gemini returned no content.";
}
