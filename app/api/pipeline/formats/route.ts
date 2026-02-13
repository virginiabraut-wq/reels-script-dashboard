import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief = body?.brief;

    if (!brief) {
      return NextResponse.json(
        { error: "Missing brief" },
        { status: 400 }
      );
    }

    const prompt = `
Sei un Format Designer per Instagram Reels.

Ricevi questo brief:
${JSON.stringify(brief, null, 2)}

Genera ESATTAMENTE 6 format.

Rispondi SOLO con JSON valido nel formato:

{
  "formats": [
    {
      "id": "fmt-001",
      "title": "...",
      "description": "...",
      "goal": "...",
      "trends": ["..."]
    }
  ]
}

Regole:
- id deve essere fmt-001 ... fmt-006
- niente testo fuori dal JSON
- niente markdown
- niente spiegazioni
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "Rispondi solo con JSON valido." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Empty model response" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
