import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brief, format } = body;

    if (!brief || !format) {
      return NextResponse.json(
        { error: "Missing brief or format" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
Sei un generatore di script UGC Instagram Reel.
Restituisci SOLO JSON valido nel formato:

{
  "scripts": [
    {
      "format_id": string,
      "script_title": string,
      "duration_seconds": number,
      "scene_by_scene": [
        {
          "t": string,
          "visual": string,
          "on_screen_text": string,
          "spoken_line": string,
          "camera_notes": string
        }
      ],
      "caption": {
        "text": string,
        "hashtags": string[]
      },
      "cta": {
        "type": string,
        "line": string
      },
      "creator_playbook": {
        "delivery_style": string,
        "energy": "low" | "medium" | "high",
        "dos": string[],
        "donts": string[],
        "editing_notes": string
      }
    }
  ],
  "export_notes": {
    "how_to_use": string,
    "assumptions": string[]
  }
}
          `,
        },
        {
          role: "user",
          content: JSON.stringify({ brief, format }),
        },
      ],
    });

    const text = completion.choices[0].message.content ?? "";
    const parsed = extractJson(text);

    // 🧠 Se il modello restituisce direttamente un array
    if (Array.isArray(parsed)) {
      return NextResponse.json({
        scripts: parsed,
        export_notes: {
          how_to_use:
            "Copia scene-by-scene in un documento per il creator.",
          assumptions: [
            "Output wrappato automaticamente perché il modello ha restituito un array.",
          ],
        },
      });
    }

    // ✅ Se è già nel formato corretto
    if (parsed && parsed.scripts) {
      return NextResponse.json(parsed);
    }

    // 🚨 Fallback sicuro
    return NextResponse.json(
      {
        error: "Invalid model response",
        raw: text,
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("SCRIPT ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}