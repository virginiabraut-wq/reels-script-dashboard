"use client";

export default function ChatKitPanel({ token }: { token: string }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 12 }}>
      <p>ChatKit qui dentro ✅</p>
      <p>Token presente: {token.slice(0, 10)}…</p>
    </div>
  );
}
