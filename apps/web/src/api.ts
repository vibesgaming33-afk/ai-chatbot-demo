export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// 🔹 API call biasa (non-stream)
export async function chat(messages: ChatMessage[]) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`Chat API failed: ${res.status}`);
  }

  return (await res.json()) as { reply: string };
}

// 🔹 API call stream (SSE)
export async function chatStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone?: () => void
) {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!chunk) continue;

      // SSE format: event: X \n data: Y
      const lines = chunk.split("\n");
      let event: string | null = null;
      let data: any = null;

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          try {
            data = JSON.parse(line.slice(5).trim());
          } catch {
            data = line.slice(5).trim();
          }
        }
      }

      if (event === "end") {
        onDone?.();
        return;
      }
      if (event === "error") {
        throw new Error(data?.message || "Stream error");
      }
      if (data?.token) {
        onToken(data.token);
      }
    }
  }
}
