import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Estrae il primo blocco JSON valido tra prima "{" e ultima "}"
function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in model output.");
  const slice = text.slice(start, end + 1);
  return JSON.parse(slice);
}

export async function POST(req: Request) {
  try {
    const { pipeline_run_id, brief, format, reason } = await req.json();

    if (!pipeline_run_id || !brief || !format?.id) {
      return NextResponse.json(
        { error: "Missing required: pipeline_run_id, brief, format.id" },
        { status: 400 }
      );
    }

    const rejectReason = (reason ?? "").trim() || "Rendi questo format più in target e più performante.";

    // salva feedback reject
    const ins = await supabase.from("format_feedback").insert({
      pipeline_run_id,
      format_id: format.id,
      decision: "reject",
      reason: rejectReason,
      brief_payload: brief,
      format_payload: format,
    });

    if (ins.error) {
      // non blocco: ritorno comunque rigenerazione
      console.warn("Supabase insert error:", ins.error.message);
    }

    // recupera memoria (ultimi 12 feedback del run)
    const { data: recent } = await supabase
      .from("format_feedback")
      .select("decision, reason, format_id, format_payload")
      .eq("pipeline_run_id", pipeline_run_id)
      .order("created_at", { ascending: false })
      .limit(12);

    const memory = (recent ?? []).map((x: any) => ({
      decision: x.decision,
      format_id: x.format_id,
      reason: x.reason,
      title: x.format_payload?.title ?? null,
    }));

    const prompt = `
Sei un Format & Concept Designer per Reels UGC (Italia).

BRIEF (JSON):
${JSON.stringify(brief, null, 2)}

FORMAT RIFIUTATO (JSON):
${JSON.stringify(format, null, 2)}

MOTIVO RIFIUTO:
${rejectReason}

MEMORIA FEEDBACK RECENTI (per evitare errori ripetuti):
${JSON.stringify(memory, null, 2)}

OBIETTIVO:
Genera ESATTAMENTE 2 alternative SOLO per questo format, più in target secondo il motivo rifiuto.
- Mantieni coerenza con vincoli, CTA, tone, target.
- Se ci sono parole vietate / no claim medici: rispettali.

OUTPUT:
Restituisci SOLO JSON valido con questa forma:

{
  "assistant_message": "2-4 frasi conversazionali",
  "replacements": [
    {
      "id": "${format.id}a",
      "title": "...",
      "description": "...",
      "goal": "engagement",
      "trends": ["..."],
      "why_this_works": ["...", "...", "..."]
    },
    {
      "id": "${format.id}b",
      "title": "...",
      "description": "...",
      "goal": "engagement",
      "trends": ["..."],
      "why_this_works": ["...", "...", "..."]
    }
  ]
}

Regole finali:
- Niente testo fuori dal JSON.
- L'output deve iniziare con "{" e finire con "}".
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = r.choices[0]?.message?.content ?? "";
    const parsed = extractJsonObject(text);

    return NextResponse.json({
      pipeline_run_id,
      assistant_message: parsed.assistant_message ?? "Ok, ecco 2 alternative aggiornate ✅",
      replacements: parsed.replacements ?? [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "feedback failed", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}