import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const GEMINI_KEY = process.env.GEMINI_API_KEY;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

async function callGemini(prompt: string) {
  if (!GEMINI_KEY) {
    throw new Error("Missing GEMINI_API_KEY for Cloud Functions");
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) {
    throw new Error(`Gemini error ${response.status}`);
  }

  const data = (await response.json()) as GeminiResponse;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export const incidentSummaryGenerator = functions.firestore
  .document("incidents/{incidentId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!before || !after) return;
    const wasResolved = before.status === "resolved";
    const nowResolved = after.status === "resolved";

    if (wasResolved || !nowResolved || after.summary) {
      return;
    }

    const text = await callGemini(
      `Summarize hotel incident as JSON with headline, timeline array, actions array. Incident: ${JSON.stringify(after)}`
    );

    let summary;
    try {
      summary = JSON.parse(text);
    } catch (err) {
      summary = { headline: "Incident", timeline: [text], actions: [] };
    }

    await change.after.ref.update({ summary });
  });

export const smartSuggestions = functions.https.onCall(async (data) => {
  const payload = data?.incidents ?? [];
  const text = await callGemini(
    `Provide concise operational suggestions for hotel emergencies. Input incidents: ${JSON.stringify(payload)}`
  );
  return { suggestions: text };
});
