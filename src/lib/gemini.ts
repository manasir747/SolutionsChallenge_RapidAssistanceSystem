import { GoogleAuth } from 'google-auth-library';

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/generative-language'
});

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

async function getAuthHeaders() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey && apiKey.startsWith('AIza')) {
    return { "x-goog-api-key": apiKey, "key": apiKey };
  }

  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return { "Authorization": `Bearer ${token.token}` };
  } catch (error) {
    console.error("[Gemini] ADC Auth failed:", error);
    return {};
  }
}

export async function callGemini(prompt: string) {
  const authData = await getAuthHeaders();
  const apiKey = authData.key;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (authData.Authorization) {
    headers["Authorization"] = authData.Authorization;
  } else if (authData["x-goog-api-key"]) {
    headers["x-goog-api-key"] = authData["x-goog-api-key"];
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  console.info("🚨 [REAL-TIME] Attempting request", {
    url: GEMINI_URL,
    authMethod: authData.Authorization ? 'ADC_TOKEN' : 'API_KEY',
    promptPreview: prompt.slice(0, 80)
  });

  let response: Response | null = null;
  let rawBody = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const fetchUrl = apiKey ? `${GEMINI_URL}?key=${apiKey}` : GEMINI_URL;
    response = await fetch(fetchUrl, {
      method: "POST",
      headers,
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
