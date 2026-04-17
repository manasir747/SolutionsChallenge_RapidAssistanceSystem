const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

class GeminiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.body = body;
  }
}

const RETRYABLE_STATUSES = new Set([429, 500, 503]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  let response: Response | null = null;
  let rawBody = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    rawBody = await response.text();

    if (response.ok) {
      break;
    }

    const isRetryable = RETRYABLE_STATUSES.has(response.status);
    console.error(`[Gemini] API error ${response.status}`, rawBody);

    if (!isRetryable || attempt === 3) {
      throw new GeminiError(`Gemini error: ${response.status}`, response.status, rawBody);
    }

    const backoffMs = 500 * attempt;
    console.info(`[Gemini] Retrying after ${backoffMs}ms`, {
      attempt,
      status: response.status
    });
    await delay(backoffMs);
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
