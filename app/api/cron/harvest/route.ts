import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // serve runtime Node per SDK

// Helper: sicurezza cron (Vercel può inviare Authorization automaticamente se configuri CRON_SECRET)
function assertCronAuth(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return; // se non lo setti, non blocchiamo (ma consigliato)

  const auth = req.headers.get("authorization") || "";
  // Vercel invia Authorization: Bearer <CRON_SECRET>
  if (!auth.includes(cronSecret)) {
    throw new Error("Unauthorized cron call");
  }
}

// Supabase insert (via REST) — evita dipendenze extra
async function supabaseInsertTrendItems(items: any[]) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const res = await fetch(`${url}/rest/v1/trend_items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=merge-duplicates", // upsert-like se hai unique key
    },
    body: JSON.stringify(items),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase insert failed: ${text}`);
  }
}

export async function GET(req: Request) {
  try {
    assertCronAuth(req);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Prompt: trend “di questi giorni”, replicabili, con strutture e driver
    const prompt = `
Sei un Trend Harvester per Reels/Shorts (Italia + globale) su: UGC, content creation, social media, creator economy.
Obiettivo: trovare concept virali e pattern replicabili degli ultimi 14 giorni (massimo 30 giorni se serve).
Devi usare web_search e restituire SOLO JSON.

REGOLE
- Cerca fonti pubbliche (articoli, roundup, blog creator, case study, tool update, trend report, pagine prodotto).
- NON copiare testi lunghi: estrai pattern e struttura.
- Deduplica (se due fonti parlano dello stesso trend, tieni un item con più fonti).
- Sii specifico: hook, beats, CTA, durata, format archetype.
- Target prioritario: Italia, ma includi trend global se replicabili in IT.

OUTPUT JSON: un array "items" (min 20, max 40).
Ogni item:
{
  "trend_id": string (slug stabile),
  "captured_at": ISO string,
  "topic_tags": string[],
  "industry_tags": string[],
  "platform_tags": string[],         // es. ["instagram","tiktok"]
  "format_archetype": string,        // es. "POV confession", "3-step tutorial", "myth busting", "duet stitch"
  "hook_type": string,               // es. "contrarian", "number", "story", "promise"
  "hook_examples": string[],         // 2-3 esempi (brevi)
  "script_beats": string[],          // 4-7 bullet
  "cta_type": string,                // "save", "comment keyword", "dm", "visit site"
  "duration_hint_seconds": number | null,
  "engagement_drivers": string[],    // es. "pattern interruption", "specificity", "social proof"
  "source_urls": string[],           // 2-5 fonti
  "notes": string,
  "confidence": "high"|"medium"|"low"
}

Restituisci:
{ "items": [ ... ] }
`;

    const response = await openai.responses.create({
      model: "gpt-5", // o quello che stai usando nel progetto
      input: prompt,
      tools: [{ type: "web_search" }], // abilita web search  [oai_citation:2‡Piattaforma OpenAI](https://platform.openai.com/docs/guides/tools-web-search?utm_source=chatgpt.com)
      // opzionale: include le fonti del web search se vuoi loggarle
      include: ["web_search_call.action.sources"],
    });

    // Estrai testo finale
    const outText =
      response.output_text ||
      (Array.isArray(response.output)
        ? response.output.map((x: any) => x?.content?.[0]?.text).filter(Boolean).join("\n")
        : "");

    if (!outText) {
      return NextResponse.json(
        { ok: false, error: "Empty response from OpenAI" },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(outText);
    } catch {
      // fallback: prova a trovare il primo blocco JSON
      const match = outText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse JSON from model output");
      parsed = JSON.parse(match[0]);
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const capturedAt = new Date().toISOString();

    // Normalizza + aggiunge timestamp stabile
    const rows = items.slice(0, 50).map((it: any) => ({
      trend_id: String(it.trend_id || "").trim(),
      captured_at: it.captured_at || capturedAt,
      topic_tags: it.topic_tags || [],
      industry_tags: it.industry_tags || [],
      platform_tags: it.platform_tags || [],
      format_archetype: it.format_archetype || "",
      hook_type: it.hook_type || "",
      hook_examples: it.hook_examples || [],
      script_beats: it.script_beats || [],
      cta_type: it.cta_type || "",
      duration_hint_seconds: it.duration_hint_seconds ?? null,
      engagement_drivers: it.engagement_drivers || [],
      source_urls: it.source_urls || [],
      notes: it.notes || "",
      confidence: it.confidence || "low",
    }));

    // filtra items senza trend_id
    const clean = rows.filter((r: any) => r.trend_id);

    await supabaseInsertTrendItems(clean);

    return NextResponse.json({
      ok: true,
      inserted: clean.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}