import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { brief } = await req.json();
    const pipeline_run_id = crypto.randomUUID();

    const prompt = `
Genera 6 format UGC per Instagram Reels coerenti con questo brief.

BRIEF (JSON):
${JSON.stringify(brief, null, 2)}

Se nel brief c'è "reference_script", usalo come riferimento per ritmo/struttura/tono senza copiare frasi.
Se nel brief ci sono "mandatory_elements", assicurati che siano esplicitamente inclusi nel format (titolo o descrizione).

VINCOLI:
- Rispetta constraints e CTA.
- id deve essere fmt-001..fmt-006.
- Output SOLO JSON valido con questa forma:
{
  "pipeline_run_id": "${pipeline_run_id}",
  "formats": [
    { "id":"fmt-001","title":"...","description":"...","goal":"...","trends":["..."] }
  ]
}

Regola finale:
- L'output deve iniziare con "{" e finire con "}".
- Nessun testo extra.
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
    });

    const text = r.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: "pipeline/run failed", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
