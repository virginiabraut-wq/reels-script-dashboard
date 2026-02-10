import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST() {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const session = await client.chatkit.sessions.create({
      workflow_id: process.env.CHATKIT_WORKFLOW_ID,
    });

    return NextResponse.json({
      sessionToken: session.client_secret,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Errore creazione sessione ChatKit" },
      { status: 500 }
    );
  }
}
