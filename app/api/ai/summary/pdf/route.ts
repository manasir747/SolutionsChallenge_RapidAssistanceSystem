import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { callGemini } from "@/lib/gemini";
import { Incident } from "@/types";

type SummaryPayload = {
  headline: string;
  timeline: string[];
  actions: string[];
};

function parseSummary(text: string): SummaryPayload {
  try {
    const parsed = JSON.parse(text) as Partial<SummaryPayload>;
    return {
      headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline : "Incident summary",
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline.filter((item): item is string => typeof item === "string") : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions.filter((item): item is string => typeof item === "string") : []
    };
  } catch {
    return {
      headline: "Incident summary",
      timeline: [text],
      actions: ["Review Gemini output"]
    };
  }
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function addWrappedLines(options: {
  page: import("pdf-lib").PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  startY: number;
  size: number;
  maxWidth: number;
  lineGap: number;
}) {
  const { page, font, text, x, startY, size, maxWidth, lineGap } = options;
  let currentY = startY;
  for (const line of wrapText(text, font, size, maxWidth)) {
    page.drawText(line, { x, y: currentY, size, font, color: rgb(0.12, 0.16, 0.24) });
    currentY -= lineGap;
  }
  return currentY;
}

export async function POST(request: Request) {
  let incident: Incident;

  try {
    ({ incident } = (await request.json()) as { incident: Incident });
  } catch {
    return NextResponse.json({ error: "Invalid incident payload" }, { status: 400 });
  }

  try {
    const text = await callGemini(
      `Create a structured hotel incident summary for PDF export. Respond as JSON with headline, timeline (array of strings), and actions (array of strings). Incident: ${JSON.stringify(
        incident
      )}`
    );

    const summary = parseSummary(text);
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const width = page.getWidth();
    const height = page.getHeight();
    const margin = 42;
    const contentWidth = width - margin * 2;

    page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: rgb(0.05, 0.08, 0.16) });
    page.drawText("Rapid Assistance System", {
      x: margin,
      y: height - 44,
      size: 18,
      font: boldFont,
      color: rgb(1, 1, 1)
    });
    page.drawText("AI-generated incident summary", {
      x: margin,
      y: height - 64,
      size: 11,
      font: regularFont,
      color: rgb(0.84, 0.89, 0.98)
    });

    let cursorY = height - 126;
    page.drawText(summary.headline, {
      x: margin,
      y: cursorY,
      size: 20,
      font: boldFont,
      color: rgb(0.08, 0.12, 0.2)
    });
    cursorY -= 28;

    const details = [
      `Incident ID: ${incident.id}`,
      `Type: ${incident.type.toUpperCase()} | Source: ${incident.source.toUpperCase()} | Status: ${incident.status.replace(/_/g, " ")}`,
      `Priority: ${incident.priority.toUpperCase()} | Affected people: ${incident.affectedPeople ?? 0}`,
      `Updated: ${new Date(incident.updatedAt ?? incident.createdAt).toLocaleString()}`
    ];

    details.forEach((line) => {
      cursorY = addWrappedLines({
        page,
        font: regularFont,
        text: line,
        x: margin,
        startY: cursorY,
        size: 11,
        maxWidth: contentWidth,
        lineGap: 15
      });
      cursorY -= 2;
    });

    cursorY -= 10;
    page.drawText("Timeline", { x: margin, y: cursorY, size: 14, font: boldFont, color: rgb(0.08, 0.12, 0.2) });
    cursorY -= 18;
    const timeline = summary.timeline.length ? summary.timeline : ["No timeline available from Gemini."];
    timeline.forEach((entry) => {
      cursorY = addWrappedLines({
        page,
        font: regularFont,
        text: `• ${entry}`,
        x: margin,
        startY: cursorY,
        size: 11,
        maxWidth: contentWidth,
        lineGap: 14
      });
      cursorY -= 4;
    });

    cursorY -= 8;
    page.drawText("Recommended actions", { x: margin, y: cursorY, size: 14, font: boldFont, color: rgb(0.08, 0.12, 0.2) });
    cursorY -= 18;
    const actions = summary.actions.length ? summary.actions : ["No recommendations available."];
    actions.forEach((entry) => {
      cursorY = addWrappedLines({
        page,
        font: regularFont,
        text: `• ${entry}`,
        x: margin,
        startY: cursorY,
        size: 11,
        maxWidth: contentWidth,
        lineGap: 14
      });
      cursorY -= 4;
    });

    page.drawText("Generated by Gemini", {
      x: margin,
      y: 26,
      size: 9,
      font: regularFont,
      color: rgb(0.42, 0.46, 0.52)
    });

    const pdfBytes = await pdf.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="incident-summary-${incident.id}.pdf"`
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}