import "dotenv/config";
import express from "express";
import cors, { type CorsOptions } from "cors";
import type { ChatMessage } from "./llm/types.js";
import { createProvider } from "./llm/provider.js";

const app = express();

// --- CORS Config ---
const corsCfg: CorsOptions = {
  origin: [/http:\/\/localhost:\d+$/], // izinkan semua localhost:<port>
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};
app.use(cors(corsCfg));
app.options("*", cors(corsCfg));

// Tambahan header manual biar SSE aman
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

const llm = createProvider();

// --- Health check ---
app.get("/api/health", (_, res) => {
  res.json({ ok: true, provider: (process.env.LLM_PROVIDER || "ollama"), ts: Date.now() });
});

// --- Fallback non-stream ---
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body as { messages: ChatMessage[] };
    const safe = (messages || []).map(m => ({
      role: m.role,
      content: String(m.content || "").slice(0, 4000),
    })) as ChatMessage[];

    const sys: ChatMessage = { role: "system", content: "Gaya bicara santai, helpful, jelas, tidak bertele-tele." };
    const reply = await llm.chat([sys, ...safe]);
    res.json({ reply });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "LLM_FAILED", detail: e?.message || "unknown" });
  }
});

// --- STREAM (SSE) ---
app.post("/api/chat/stream", async (req, res) => {
  console.log("[SSE] /api/chat/stream hit");

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  (res as any).flushHeaders?.();
  res.write(":\n\n");

  const send = (event: string | null, data: any) => {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
  };
  const close = () => { try { res.end(); } catch { } };
  req.on("close", () => close());

  try {
    const { messages } = req.body as { messages: ChatMessage[] };
    const safe = (messages || []).map(m => ({
      role: m.role,
      content: String(m.content || "").slice(0, 4000),
    })) as ChatMessage[];

    const sys: ChatMessage = { role: "system", content: "Gaya bicara santai, helpful, jelas, tidak bertele-tele." };

    const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
    if (provider !== "ollama") {
      const reply = await llm.chat([sys, ...safe]);
      send(null, { token: reply });
      send("end", {});
      return close();
    }

    const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3:latest";

    const userLast = [...safe].reverse().find(m => m.role === "user")?.content ?? "";
    const prompt = [sys.content, userLast].filter(Boolean).join("\n\n");

    const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL, prompt, stream: true,
        options: { temperature: 0.7, top_p: 0.9, num_predict: 256 }
      })
    });

    if (!resp.ok || !resp.body) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Ollama stream failed ${resp.status}: ${txt}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const json = JSON.parse(line) as { response?: string; done?: boolean };
          if (json.response) send(null, { token: json.response });
          if (json.done) { send("end", {}); return close(); }
        } catch { }
      }
    }
    send("end", {}); close();
  } catch (e: any) {
    console.error(e);
    send("error", { message: e?.message || "unknown error" });
    close();
  }
});

// --- Root info ---
app.get("/", (_, res) => res.type("text/plain").send("AI Chatbot Demo API is running. See /api/health"));

// --- Start server ---
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API ready at http://localhost:${port}`));
