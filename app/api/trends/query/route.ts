import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toLowerSafe(v: string | null) {
  return (v || "").toLowerCase().trim();
}

export async function GET(req: Request) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

    const { searchParams } = new URL(req.url);

    // filtri
    const industry = toLowerSafe(searchParams.get("industry"));
    const platform = toLowerSafe(searchParams.get("platform")); // instagram | tiktok
    const days = Number(searchParams.get("days") || "14");
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);

    // timeframe
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Query Supabase via REST:
    // - captured_at >= since
    // - opzionale: filtri su industry/platform (jsonb array contains)
    // Nota: il filtro "cs" su jsonb array funziona se platform_tags/industry_tags sono jsonb array
    const qp: string[] = [];
    qp.push(`captured_at=gte.${encodeURIComponent(since)}`);
    qp.push(`order=captured_at.desc`);
    qp.push(`limit=${limit}`);

    if (industry) {
      // industry_tags contiene "beauty" etc.
      qp.push(`industry_tags=cs.${encodeURIComponent(JSON.stringify([industry]))}`);
    }
    if (platform) {
      qp.push(`platform_tags=cs.${encodeURIComponent(JSON.stringify([platform]))}`);
    }

    const res = await fetch(`${url}/rest/v1/trend_items?${qp.join("&")}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase query failed: ${text}`);

    const rows = JSON.parse(text);

    return NextResponse.json({
      ok: true,
      meta: { since, days, industry: industry || null, platform: platform || null, limit },
      items: rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}