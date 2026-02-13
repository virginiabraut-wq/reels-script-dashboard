import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Use POST to create a ChatKit session." });
}

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.CHATKIT_WORKFLOW_ID;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (!workflowId) {
      return NextResponse.json({ error: "Missing CHATKIT_WORKFLOW_ID" }, { status: 500 });
    }

  const resp = await fetch("https://api.openai.com/v1/chatkit/sessions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "chatkit_beta=v1",
  },
  body: JSON.stringify({
    user: "local-user",
    workflow: { id: workflowId },
  }),
});

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: "ChatKit session create failed", details: data },
        { status: resp.status }
      );
    }

    // data dovrebbe contenere un client secret / token per il client
    return NextResponse.json({
      sessionToken: data.client_secret ?? data.session_token ?? data,
    });
  } catch (error) {
    console.error("ChatKit session error:", error);
    return NextResponse.json(
      { error: "Errore creazione sessione ChatKit", details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
