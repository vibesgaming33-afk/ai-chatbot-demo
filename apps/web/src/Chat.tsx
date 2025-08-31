import { useState } from "react";
import { chatStream } from "./api";
import type { ChatMessage } from "./api";

export default function ChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const newMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    let reply = "";

    await chatStream([...messages, newMsg], (token) => {
      reply += token;
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "assistant"),
        { role: "assistant", content: reply },
      ]);
    }, () => setLoading(false));
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-blue-600" : "text-green-600"}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="border p-2 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
