import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { GoogleAuth } from 'google-auth-library';

admin.initializeApp();

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/generative-language'
});

async function getAuthHeaders() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.startsWith('AIza')) {
    console.log('[Gemini] Functions: Using provided API Key');
    return { "x-goog-api-key": apiKey, "key": apiKey };
  }
  
  console.log('[Gemini] Functions: No API Key found, attempting Service Account (ADC)...');
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return { "Authorization": `Bearer ${token.token}` };
}

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
  const authData = await getAuthHeaders();
  const apiKey = authData.key;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (authData.Authorization) {
    headers["Authorization"] = authData.Authorization;
  } else if (authData["x-goog-api-key"]) {
    headers["x-goog-api-key"] = authData["x-goog-api-key"];
  }

  const fetchUrl = apiKey ? `${GEMINI_ENDPOINT}?key=${apiKey}` : GEMINI_ENDPOINT;
  const response = await fetch(fetchUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Gemini] Functions error ${response.status}`, errorBody);
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
