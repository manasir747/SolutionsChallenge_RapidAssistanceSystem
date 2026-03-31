import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { Incident } from "@/types";

export async function POST(request: Request) {
  const { incident } = (await request.json()) as { incident: Incident };

  try {
    const text = await callGemini(
      `Create a structured summary for this hotel incident. Respond as JSON with headline, timeline (array), and actions (array). Incident: ${JSON.stringify(
        incident
      )}`
    );
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      parsed = {
        headline: "Incident summary",
        timeline: [text],
        actions: ["Review Gemini output"]
      };
    }
    return NextResponse.json({ summary: parsed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gemini summary failed" },
      { status: 500 }
    );
  }
}
