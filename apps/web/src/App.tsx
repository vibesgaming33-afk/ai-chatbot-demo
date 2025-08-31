import Chat from "./components/Chat";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 border-b border-neutral-800 bg-neutral-950/70 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">AI Chatbot Demo</h1>
          <span className="text-xs opacity-70">React + Tailwind + Express (Ollama)</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Chat />
      </main>
      <footer className="py-10 text-center text-xs opacity-60">Built for Upwork 💼</footer>
    </div>
  );
}
