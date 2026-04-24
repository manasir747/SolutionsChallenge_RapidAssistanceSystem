import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { UserRole } from "@/types";

const VALID_ROLES: ReadonlyArray<UserRole> = ["guest", "staff", "admin"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

export async function POST(request: Request) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("[/api/ai/chat] Failed to parse JSON payload", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const promptValue = payload.prompt;
  const prompt = typeof promptValue === "string" ? promptValue.trim() : "";
  const requestedRole = payload.role;
  const role = isUserRole(requestedRole) ? requestedRole : "guest";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  console.info("[/api/ai/chat] Handling prompt", {
    role,
    promptPreview: prompt.slice(0, 80)
  });

  try {
    const answer = await callGemini(
      `MISSION CRITICAL: You are the AI Emergency Coordinator for a smart hotel. 
      Target Audience: ${role}
      Current Situation: Active Tactical Alert

      FORMATTING RULES (STRICT):
      1. Use clear BULLET POINTS (use the '•' character) for instructions.
      2. Keep every sentence under 15 words.
      3. Add double newlines between different points for visual clarity.
      4. DO NOT use long paragraphs.
      5. Start with a 1-sentence status summary in BOLD (use **text**).
      6. Use ALL CAPS for critical warning words (e.g., DANGER, EXIT, STOP).

      User Prompt: ${prompt}`
    );

    console.info("[/api/ai/chat] Gemini response ready", {
      hasAnswer: Boolean(answer)
    });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[/api/ai/chat] Gemini request failed", err);
    const message = err instanceof Error ? err.message : "Unable to reach Gemini";
    const status = err instanceof Error && "status" in err && typeof err.status === "number"
      ? err.status
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
