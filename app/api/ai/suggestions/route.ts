import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(request: Request) {
  const { incidents = [] } = await request.json().catch(() => ({ incidents: [] }));

  try {
    const prompt = `Provide up to three operational recommendations for a hotel crisis room. Input incidents: ${JSON.stringify(
      incidents
    )}. Each recommendation should include a short title, detail, and severity (info|warning|critical).`;

    const generated = await callGemini(prompt);
    const suggestions = generated
      .split(/\n\n/)
      .filter(Boolean)
      .slice(0, 3)
      .map((chunk: string, idx: number) => ({
        id: `suggestion-${idx}`,
        title: chunk.split("\n")[0] ?? "Action",
        detail: chunk,
        severity: chunk.toLowerCase().includes("evacuate") ? "critical" : "info"
      }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to reach Gemini";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
