"use client";

import React, { useMemo, useRef, useState } from "react";
import BriefForm, { Brief, BriefDraft } from "./BriefForm";
import CustomChatPanel, { CustomChatPanelHandle } from "./CustomChatPanel";

type FormatItem = {
  id: string;
  title: string;
  description: string;
  goal?: string;
  trends?: string[];
};

type ScriptItem = {
  format_id: string;
  script_title: string;
  duration_seconds: number;
  scene_by_scene: Array<{
    t: string;
    visual: string;
    on_screen_text: string;
    spoken_line: string;
    camera_notes: string;
  }>;
  caption: { text: string; hashtags: string[] };
  cta: { type: string; line: string };
  creator_playbook: {
    delivery_style: string;
    energy: "low" | "medium" | "high";
    dos: string[];
    donts: string[];
    editing_notes: string;
  };
};

async function postJson<TResponse>(
  url: string,
  body: unknown
): Promise<{ ok: true; data: TResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();

    if (!res.ok) {
      const safe = text.startsWith("<!DOCTYPE") ? `HTTP ${res.status}` : text;
      return { ok: false, error: safe };
    }

    const data = (text ? JSON.parse(text) : {}) as TResponse;
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    return { ok: false, error: msg };
  }
}

export default function DashboardPage() {
  const chatRef = useRef<CustomChatPanelHandle | null>(null);

  const [brief, setBrief] = useState<Brief | null>(null);

  const [formats, setFormats] = useState<FormatItem[]>([]);
  const [formatsLoading, setFormatsLoading] = useState(false);
  const [formatsError, setFormatsError] = useState<string | null>(null);

  const [approvedIds, setApprovedIds] = useState<Record<string, true>>({});
  const [reworkNotes, setReworkNotes] = useState<Record<string, string>>({});
  const [reworkLoadingId, setReworkLoadingId] = useState<string | null>(null);

  // scripts per singolo format
  const [scriptsByFormat, setScriptsByFormat] = useState<Record<string, ScriptItem[]>>({});
  const [scriptsLoadingId, setScriptsLoadingId] = useState<string | null>(null);
  const [scriptsErrorByFormat, setScriptsErrorByFormat] = useState<Record<string, string>>({});

  const approvedFormats = useMemo(() => {
    const ids = new Set(Object.keys(approvedIds));
    return formats.filter((f) => ids.has(f.id));
  }, [formats, approvedIds]);

  function resetDownstream() {
    setFormats([]);
    setApprovedIds({});
    setReworkNotes({});
    setReworkLoadingId(null);
    setScriptsByFormat({});
    setScriptsLoadingId(null);
    setScriptsErrorByFormat({});
    setFormatsError(null);
  }

  async function onSubmitBrief(draft: BriefDraft) {
    const normalized: Brief = {
      topic: draft.topic.trim(),
      industry: draft.industry.trim(),
      platform: draft.platform,
      content_goal: draft.content_goal,
      campaign_objective: draft.campaign_objective,
      target_audience: draft.target_audience.trim(),
      tone_of_voice: draft.tone_of_voice.map((t) => t.trim()).filter(Boolean),
      creator_type: draft.creator_type,
      deliverable: draft.deliverable.map((d) => d.toLowerCase().trim()).filter(Boolean),
      constraints: draft.constraints.length ? draft.constraints : ["nessuno"],
      cta: draft.cta.trim(),
    };

    setBrief(normalized);
    resetDownstream();

    const message = `BRIEF_JSON:\n${JSON.stringify({ brief: normalized }, null, 2)}`;
    chatRef.current?.startNewThread(message);

    setFormatsLoading(true);
    setFormatsError(null);

    const res = await postJson<{ formats: FormatItem[] }>("/api/pipeline/formats", {
      brief: normalized,
    });

    setFormatsLoading(false);

    if (!res.ok) {
      setFormatsError(`Errore format: ${res.error}`);
      return;
    }

    const nextFormats = Array.isArray(res.data.formats) ? res.data.formats : [];
    setFormats(nextFormats);
  }

  function approveFormat(id: string) {
    setApprovedIds((prev) => ({ ...prev, [id]: true }));
    setScriptsErrorByFormat((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function unapproveFormat(id: string) {
    setApprovedIds((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  async function reworkFormat(id: string) {
    if (!brief) return;

    const note = (reworkNotes[id] ?? "").trim();
    if (!note) {
      setFormatsError("Scrivi una motivazione per il rifiuto (anche breve).");
      return;
    }

    setFormatsError(null);
    setReworkLoadingId(id);

    const current = formats.find((f) => f.id === id);

    const res = await postJson<{
      alternatives?: FormatItem[];
      updated_format?: FormatItem;
    }>("/api/pipeline/feedback", {
      brief,
      format_id: id,
      reason: note,
      current_format: current ?? null,
    });

    setReworkLoadingId(null);

    if (!res.ok) {
      setFormatsError(`Errore feedback: ${res.error}`);
      return;
    }

    setFormats((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;

      const updated = res.data.updated_format;
      const alts = res.data.alternatives;

      if (updated && updated.id) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }

      if (Array.isArray(alts) && alts.length > 0) {
        const before = prev.slice(0, idx);
        const after = prev.slice(idx + 1);
        return [...before, ...alts, ...after];
      }

      return prev;
    });

    unapproveFormat(id);
    setScriptsByFormat((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  async function generateScriptsForFormat(formatId: string) {
    if (!brief) return;

    const format = formats.find((f) => f.id === formatId);
    if (!format) return;

    setScriptsLoadingId(formatId);
    setScriptsErrorByFormat((prev) => {
      const copy = { ...prev };
      delete copy[formatId];
      return copy;
    });

    try {
      const res = await postJson<{ scripts: ScriptItem[] }>("/api/pipeline/scripts", {
        brief,
        format,
        approved_formats: [format],
      });

      if (!res.ok) {
        setScriptsErrorByFormat((prev) => ({
          ...prev,
          [formatId]: `Errore script: ${res.error}`,
        }));
        return;
      }

      const list = Array.isArray(res.data.scripts) ? res.data.scripts : [];
      setScriptsByFormat((prev) => ({ ...prev, [formatId]: list }));
    } finally {
      setScriptsLoadingId(null);
    }
  }

  const totalScripts = useMemo(() => {
    return Object.values(scriptsByFormat).reduce((acc, arr) => acc + arr.length, 0);
  }, [scriptsByFormat]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Franci.GPT💜</h1>
          <p className="text-sm text-zinc-600">Brief → Trend → Format → Script</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* SIDEBAR: SOLO BRIEF */}
          <aside className="rounded-2xl border bg-purple-100 p-4 shadow-sm">
            <BriefForm
              key={brief ? `${brief.topic}-${brief.industry}` : "empty"}
              onSubmit={onSubmitBrief}
              disabled={formatsLoading || scriptsLoadingId !== null}
            />
          </aside>

          {/* MAIN: CHAT + FORMAT + SCRIPT */}
          <main className="min-h-0 rounded-2xl border bg-white p-4 shadow-sm flex flex-col gap-6">
            {/* CHAT */}
            <section className="min-h-0 flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Chat (conversazione)</div>
                  <div className="text-xs text-zinc-600">
                    Qui puoi chiedere variazioni, chiarimenti, alternative.
                  </div>
                </div>
                {totalScripts > 0 && (
                  <div className="text-xs text-zinc-600">
                    Script totali: <b>{totalScripts}</b>
                  </div>
                )}
              </div>

              {/* wrapper per far respirare la chat */}
              <div className="min-h-0">
                <div className="h-[55vh] min-h-90 w-full">
                  <CustomChatPanel ref={chatRef} />
                </div>
              </div>
            </section>

            {/* FORMAT (spostati qui) */}
            <section className="rounded-2xl border bg-zinc-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Format</h2>
                {formatsLoading && <span className="text-xs text-zinc-500">genero…</span>}
              </div>

              {formatsError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {formatsError}
                </div>
              )}

              {formats.length === 0 && !formatsLoading && (
                <div className="rounded-lg border bg-white p-3 text-xs text-zinc-600">
                  Compila il brief e premi <b>Genera</b> per ottenere i format.
                </div>
              )}

              <div className="space-y-3">
                {formats.map((f) => {
                  const isApproved = Boolean(approvedIds[f.id]);
                  const isReworking = reworkLoadingId === f.id;
                  const isGeneratingScript = scriptsLoadingId === f.id;
                  const scriptError = scriptsErrorByFormat[f.id];
                  const hasScripts = (scriptsByFormat[f.id]?.length ?? 0) > 0;

                  return (
                    <div key={f.id} className="rounded-xl border p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-900">{f.title}</div>
                          <div className="mt-1 text-xs text-zinc-600">{f.description}</div>

                          {f.goal && (
                            <div className="mt-2 text-xs text-zinc-700">
                              <span className="font-medium">Goal:</span> {f.goal}
                            </div>
                          )}
                        </div>

                        {isApproved && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800">
                            Approvato
                          </span>
                        )}
                      </div>

                      {/* Se NON approvato: approva/rifiuta + note */}
                      {!isApproved && (
                        <>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => approveFormat(f.id)}
                              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                              disabled={isReworking || isGeneratingScript}
                            >
                              Approva
                            </button>
                            <button
                              type="button"
                              onClick={() => reworkFormat(f.id)}
                              className="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                              disabled={isReworking || isGeneratingScript}
                            >
                              {isReworking ? "Rigenero…" : "Rifiuta & rigenera"}
                            </button>
                          </div>

                          <div className="mt-2">
                            <label className="text-[11px] font-medium text-zinc-700">
                              Perché non va? (1 riga basta)
                            </label>
                            <textarea
                              value={reworkNotes[f.id] ?? ""}
                              onChange={(e) =>
                                setReworkNotes((prev) => ({
                                  ...prev,
                                  [f.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              className="mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-zinc-200"
                              placeholder="Es: troppo generico / non adatto al target / hook debole…"
                            />
                          </div>
                        </>
                      )}

                      {/* Se APPROVATO: appare Genera Script */}
                      {isApproved && (
                        <div className="mt-3 space-y-2">
                          {scriptError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                              {scriptError}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => generateScriptsForFormat(f.id)}
                              disabled={isGeneratingScript}
                              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                            >
                              {isGeneratingScript ? "Genero…" : hasScripts ? "Rigenera script" : "Genera script"}
                            </button>

                            <button
                              type="button"
                              onClick={() => unapproveFormat(f.id)}
                              className="rounded-lg border px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                              disabled={isGeneratingScript}
                              title="Torna modificabile (riappare Approva/Rifiuta)"
                            >
                              Sblocca
                            </button>
                          </div>

                          {hasScripts && (
                            <div className="text-[11px] text-zinc-600">Script creati ✅ (li trovi sotto)</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SCRIPT (sempre visibili qui) */}
            <section className="rounded-2xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">Script generati</h3>
                {totalScripts > 0 && (
                  <div className="text-xs text-zinc-600">
                    Totale: <b>{totalScripts}</b>
                  </div>
                )}
              </div>

              {totalScripts === 0 ? (
                <div className="rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-600">
                  Approva un format e premi <b>Genera script</b>.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(scriptsByFormat).map(([formatId, scripts]) => {
                    const fmt = formats.find((f) => f.id === formatId);
                    const title = fmt?.title ?? formatId;

                    return (
                      <div key={formatId} className="rounded-2xl border p-4">
                        <div className="mb-2">
                          <div className="text-sm font-semibold text-zinc-900">{title}</div>
                          <div className="text-xs text-zinc-600">
                            {formatId} • {scripts.length} script
                          </div>
                        </div>

                        <div className="space-y-3">
                          {scripts.map((s) => (
                            <details key={`${s.format_id}-${s.script_title}`} className="rounded-xl border p-3">
                              <summary className="cursor-pointer list-none">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-zinc-900">{s.script_title}</div>
                                    <div className="text-xs text-zinc-600">{s.duration_seconds}s</div>
                                  </div>
                                  <span className="text-xs text-zinc-500">Apri</span>
                                </div>
                              </summary>

                              <div className="mt-3 space-y-3 text-sm">
                                <div className="rounded-lg bg-zinc-50 p-3">
                                  <div className="text-xs font-semibold text-zinc-800">Scene-by-scene</div>
                                  <div className="mt-2 space-y-2">
                                    {s.scene_by_scene.map((sc, idx) => (
                                      <div key={idx} className="text-xs text-zinc-700">
                                        <div className="font-medium">
                                          {sc.t} — {sc.on_screen_text}
                                        </div>
                                        <div className="mt-1">
                                          <span className="font-medium">Dice:</span> {sc.spoken_line}
                                        </div>
                                        <div className="mt-1 text-zinc-600">
                                          <span className="font-medium">Visual:</span> {sc.visual}
                                        </div>
                                        <div className="mt-1 text-zinc-600">
                                          <span className="font-medium">Camera:</span> {sc.camera_notes}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="rounded-lg border p-3">
                                    <div className="text-xs font-semibold text-zinc-800">Caption</div>
                                    <p className="mt-2 text-xs text-zinc-700 whitespace-pre-wrap">{s.caption.text}</p>
                                  </div>

                                  <div className="rounded-lg border p-3">
                                    <div className="text-xs font-semibold text-zinc-800">Creator playbook</div>
                                    <div className="mt-2 text-xs text-zinc-700">
                                      <div>
                                        <span className="font-medium">Stile:</span> {s.creator_playbook.delivery_style}
                                      </div>
                                      <div className="mt-1">
                                        <span className="font-medium">Energia:</span> {s.creator_playbook.energy}
                                      </div>
                                      <div className="mt-2 font-medium">Do</div>
                                      <ul className="list-disc pl-4">
                                        {s.creator_playbook.dos.map((d, i) => (
                                          <li key={i}>{d}</li>
                                        ))}
                                      </ul>
                                      <div className="mt-2 font-medium">Don’t</div>
                                      <ul className="list-disc pl-4">
                                        {s.creator_playbook.donts.map((d, i) => (
                                          <li key={i}>{d}</li>
                                        ))}
                                      </ul>
                                      <div className="mt-2">
                                        <span className="font-medium">Editing:</span> {s.creator_playbook.editing_notes}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}