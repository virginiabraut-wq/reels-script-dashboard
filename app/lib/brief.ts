// app/lib/brief.ts
export type Platform = "Instagram" | "TikTok" | "Instagram+TikTok";
export type ContentGoal = "organico" | "adv";
export type CampaignObjective = "awareness" | "engagement" | "conversion" | "lead";

export type VideoPurpose =
  | "educare"
  | "intrattenere"
  | "convertire"
  | "posizionamento_authority"
  | "community_building";

export type ContentArchetype =
  | "mini_tutorial"
  | "storytelling"
  | "myth_busting"
  | "grwm"
  | "lista_top3"
  | "pov_opinione"
  | "before_after"
  | "review_demo";

export type TrendMode = "strict" | "adapt" | "hybrid" | "original";

export type HookType =
  | "did_you_know"
  | "errore_comune"
  | "confessione"
  | "domanda"
  | "statistica"
  | "shock"
  | "pov";

export type EmotionalTone =
  | "calmo"
  | "energico"
  | "empatico"
  | "ironico"
  | "minimal"
  | "ispirazionale"
  | "polemico";

export type AwarenessLevel = "unaware" | "problem_aware" | "solution_aware" | "product_aware";
export type DesiredReaction = "commento" | "salvataggio" | "condivisione" | "visita_profilo" | "acquisto";

export type CreatorType =
  | "creator_consumer"
  | "creator_expert"
  | "brand_face"
  | "ugc_creator";

export type Deliverable = "reel" | "carosello" | "script_video" | "piu_formati";

export type Brief = {
  // core
  topic: string;
  industry: string;
  platform: Platform;

  // strategy
  content_goal: ContentGoal;
  campaign_objective: CampaignObjective;

  // audience & voice
  target_audience: string;
  tone_of_voice: string[]; // libero ma guidato da UI
  creator_type: CreatorType;
  deliverable: Deliverable[];

  // NEW: intent & creative
  video_purpose: VideoPurpose;
  content_archetype: ContentArchetype;
  trend_mode: TrendMode;

  core_insight: string;         // "cosa pensa male / tensione"
  hook_type: HookType;
  emotional_tone: EmotionalTone;

  // NEW: constraints strutturati
  max_duration_seconds: number; // 15/30/45/60...
  claim_restrictions: string;   // es: "no medical claims"
  words_to_avoid: string[];     // ["miracoloso", ...]
  mandatory_elements: string[]; // es: ["testo overlay", "mostra prodotto"]
  
  // NEW: psych
  awareness_level: AwarenessLevel;
  desired_reaction: DesiredReaction;

  // (compat) se vuoi tenere “constraints” legacy per log/debug
  constraints_legacy?: string[];
};

// Draft per form
export type BriefDraft = Omit<
  Brief,
  "tone_of_voice" | "words_to_avoid" | "mandatory_elements" | "deliverable"
> & {
  tone_of_voice: string;       // textarea “a virgola o a capo”
  words_to_avoid: string;      // textarea “a virgola o a capo”
  mandatory_elements: string;  // textarea “una per riga”
  deliverable: Deliverable[];  // checkbox
};