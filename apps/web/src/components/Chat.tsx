import { useEffect, useRef, useState } from "react";
type Msg = { role: "user" | "assistant"; content: string };

const API_BASE = "http://localhost:5174";

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Halo! Tanyain apa aja, aku jawab 😉" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input.trim() } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);

    // placeholder jawaban assistant
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const appendToken = (token: string) => {
      setMessages(prev => {
        const copy = [...prev];
        const i = copy.length - 1;
        copy[i] = { ...copy[i], content: copy[i].content + token };
        return copy;
      });
    };

    try {
      // --- coba STREAM dulu ---
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // cache no-store biar gak diinterfere devtools/extension
        cache: "no-store",
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) throw new Error("Stream not available");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const block of parts) {
          const lines = block.split("\n");
          let eventName: string | null = null;
          for (const line of lines) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            else if (line.startsWith("data:")) {
              const payload = line.slice(5).trim();
              if (eventName === "end") {
                // selesai
              } else if (eventName === "error") {
                try {
                  const obj = JSON.parse(payload) as { message?: string };
                  appendToken(`\n❌ ${obj.message || "stream error"}`);
                } catch {}
              } else {
                try {
                  const obj = JSON.parse(payload) as { token?: string };
                  if (obj.token) appendToken(obj.token);
                } catch {
                  appendToken(payload);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("stream failed, falling back to non-stream:", e);
      // --- Fallback non-stream ---
      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const data = await res.json();
        if (typeof data?.reply === "string") {
          appendToken(data.reply);
        } else {
          appendToken("❌ Gagal mengambil jawaban.");
        }
      } catch {
        appendToken("❌ Error streaming dari server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-neutral-200/10 bg-neutral-900/50 p-4">
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-100"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs opacity-70">Typing…</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          placeholder="Ketik pesan…"
          className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : undefined)}
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
