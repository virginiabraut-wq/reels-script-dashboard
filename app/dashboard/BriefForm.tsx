"use client";

import React, { useMemo, useState } from "react";

export type Brief = {
  topic?: string;
  industry?: string;
  platform?: "Instagram" | "TikTok" | "Instagram+TikTok";
  content_goal?: "organico" | "adv";
  campaign_objective?: "awareness" | "engagement" | "conversion" | "lead";
  target_audience?: string;
  tone_of_voice?: string[];
  creator_type?: "creator esperto" | "creator consumer" | "creator testimonial";
  deliverable?: string[]; // lowercase
  constraints?: string[];
  cta?: string;
  reference_script?: string;
  video_purpose?: string;
  content_archetype?: string;
  hook_type?: string;
  emotional_tone?: string;
  max_duration_seconds?: number;
  words_to_avoid?: string[];
  mandatory_elements?: string[];
  awareness_level?: string;
  desired_reaction?: string;
};

export type BriefDraft = Omit<Brief, "deliverable" | "constraints"> & {
  deliverable: string[];
  constraints: string[];
};

const PLATFORM_OPTIONS: Brief["platform"][] = ["Instagram", "TikTok", "Instagram+TikTok"];
const CONTENT_GOAL_OPTIONS: Brief["content_goal"][] = ["organico", "adv"];
const OBJECTIVE_OPTIONS: Brief["campaign_objective"][] = ["awareness", "engagement", "conversion", "lead"];
const CREATOR_OPTIONS: Brief["creator_type"][] = ["creator consumer", "creator esperto", "creator testimonial"];

const CTA_PRESETS = [
  "salva per dopo",
  "condividi con un’amica",
  "commenta con la tua esperienza",
  "scrivimi in DM",
  "visita il sito",
];

const DELIVERABLE_OPTIONS = ["reel", "carosello", "script video", "più formati"];

function splitCommaOrNewline(input: string): string[] {
  return input
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function BriefForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (draft: BriefDraft) => void;
  disabled?: boolean;
}) {
  const [topic, setTopic] = useState("");
  const [industry, setIndustry] = useState("");
  const [platform, setPlatform] = useState<Brief["platform"]>("Instagram");
  const [contentGoal, setContentGoal] = useState<Brief["content_goal"]>("organico");
  const [objective, setObjective] = useState<Brief["campaign_objective"]>("engagement");
  const [targetAudience, setTargetAudience] = useState("");
  const [tovText, setTovText] = useState("autentico, educational");
  const [creatorType, setCreatorType] = useState<Brief["creator_type"]>("creator consumer");
  const [deliverable, setDeliverable] = useState<string[]>(["reel"]);
  const [constraintsText, setConstraintsText] = useState("");
  const [cta, setCta] = useState<string>("salva per dopo");
  const [videoPurpose, setVideoPurpose] = useState("");
  const [contentArchetype, setContentArchetype] = useState("");
  const [hookType, setHookType] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("");
  const [maxDurationSeconds, setMaxDurationSeconds] = useState("");
  const [wordsToAvoidText, setWordsToAvoidText] = useState("");
  const [mandatoryElementsText, setMandatoryElementsText] = useState("");
  const [awarenessLevel, setAwarenessLevel] = useState("");
  const [desiredReaction, setDesiredReaction] = useState("");

  const isValid = useMemo(() => true, []);

  function toggleDeliverable(v: string) {
    setDeliverable((prev) => {
      const set = new Set(prev);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      return Array.from(set);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const draft: BriefDraft = {
      topic,
      industry,
      platform,
      content_goal: contentGoal,
      campaign_objective: objective,
      target_audience: targetAudience,
      tone_of_voice: splitCommaOrNewline(tovText),
      creator_type: creatorType,
      deliverable,
      constraints: splitCommaOrNewline(constraintsText),
      cta,
      video_purpose: videoPurpose,
      content_archetype: contentArchetype,
      hook_type: hookType,
      emotional_tone: emotionalTone,
      max_duration_seconds: maxDurationSeconds ? Number(maxDurationSeconds) : undefined,
      words_to_avoid: splitCommaOrNewline(wordsToAvoidText),
      mandatory_elements: splitCommaOrNewline(mandatoryElementsText),
      awareness_level: awarenessLevel,
      desired_reaction: desiredReaction,
    };

    onSubmit(draft);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border bg-white/70 p-4">
        <div className="text-base font-semibold text-zinc-900">Brief</div>
        <div className="mt-1 text-sm text-zinc-600">
          Compila → premi <b>Genera</b> → poi approvi/rifiuti i format.
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Topic">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. skincare sostenibile"
          />
        </Field>

        <Field label="Industry">
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. Beauty"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="📱 Platform">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Brief["platform"])}
              className="w-full h-11 rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="🎯 Content goal">
            <select
              value={contentGoal}
              onChange={(e) => setContentGoal(e.target.value as Brief["content_goal"])}
              className="w-full h-11 rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            >
              {CONTENT_GOAL_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Objective">
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value as Brief["campaign_objective"])}
            className="w-full h-11 rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-zinc-200"
          >
            {OBJECTIVE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Target audience (descrizione sintetica)">
          <textarea
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. Donne 25-34, interessate a routine semplici e sostenibili…"
          />
        </Field>

        <Field label="Tone of voice (virgola o a capo)">
          <textarea
            value={tovText}
            onChange={(e) => setTovText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder='Es. autentico, educational, ironico'
          />
        </Field>

        <Field label="Creator type">
          <select
            value={creatorType}
            onChange={(e) => setCreatorType(e.target.value as Brief["creator_type"])}
            className="w-full h-11 rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-zinc-200"
          >
            {CREATOR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Deliverable">
          <div className="grid gap-2 sm:grid-cols-2">
            {DELIVERABLE_OPTIONS.map((v) => {
              const checked = deliverable.includes(v);
              return (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-base hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDeliverable(v)}
                  />
                  <span className="capitalize">{v}</span>
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Constraints (una per riga)">
          <textarea
            value={constraintsText}
            onChange={(e) => setConstraintsText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder={`claim vietati: …\nparole da evitare: …\ndurata max: …`}
          />
        </Field>

        <Field label="CTA">
          <select
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            className="w-full h-11 rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-zinc-200"
          >
            {CTA_PRESETS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
            <option value="custom">custom…</option>
          </select>

          {cta === "custom" && (
            <input
              className="mt-2 w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
              placeholder="Scrivi una CTA precisa…"
              onChange={(e) => setCta(e.target.value)}
            />
          )}
        </Field>

        <Field label="Video purpose">
          <input
            value={videoPurpose}
            onChange={(e) => setVideoPurpose(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. educare, ispirare, convertire"
          />
        </Field>

        <Field label="Content archetype">
          <input
            value={contentArchetype}
            onChange={(e) => setContentArchetype(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. tutorial, recensione, storytelling"
          />
        </Field>

        <Field label="Hook type">
          <input
            value={hookType}
            onChange={(e) => setHookType(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. shock, domanda, problema/soluzione"
          />
        </Field>

        <Field label="Emotional tone">
          <input
            value={emotionalTone}
            onChange={(e) => setEmotionalTone(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. empatico, energico, autorevole"
          />
        </Field>

        <Field label="Max duration (seconds)">
          <input
            value={maxDurationSeconds}
            onChange={(e) => setMaxDurationSeconds(e.target.value)}
            type="number"
            min={1}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. 30"
          />
        </Field>

        <Field label="Words to avoid (virgola o a capo)">
          <textarea
            value={wordsToAvoidText}
            onChange={(e) => setWordsToAvoidText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. miracoloso, garantito..."
          />
        </Field>

        <Field label="Mandatory elements (virgola o a capo)">
          <textarea
            value={mandatoryElementsText}
            onChange={(e) => setMandatoryElementsText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. brand name, pricing, disclaimer..."
          />
        </Field>

        <Field label="Awareness level">
          <input
            value={awarenessLevel}
            onChange={(e) => setAwarenessLevel(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. unaware, problem-aware, solution-aware"
          />
        </Field>

        <Field label="Desired reaction">
          <input
            value={desiredReaction}
            onChange={(e) => setDesiredReaction(e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-200"
            placeholder="Es. commenta, salva, visita il sito"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={!isValid || Boolean(disabled)}
        className="w-full rounded-xl bg-zinc-900 px-4 py-4 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {disabled ? "Attendi…" : "Genera"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-zinc-800">{label}</div>
      {children}
    </div>
  );
}
