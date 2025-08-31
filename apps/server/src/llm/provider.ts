import type { LLMProvider } from './types.js';
import { OllamaProvider } from './providers/ollama.js';
export function createProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
  switch (provider) {
    default: return new OllamaProvider();
  }
}
