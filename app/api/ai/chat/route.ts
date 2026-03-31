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
      `You are assisting a ${role} inside a hotel emergency. Respond with concise, calm guidance. Prompt: ${prompt}`
    );

    console.info("[/api/ai/chat] Gemini response ready", {
      hasAnswer: Boolean(answer)
    });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[/api/ai/chat] Gemini request failed", err);
    const message = err instanceof Error ? err.message : "Unable to reach Gemini";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
