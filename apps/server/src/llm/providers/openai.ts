import type { ChatMessage, LLMProvider } from '../types.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export class OpenAIProvider implements LLMProvider {
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY kosong.');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': Bearer ,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.7 })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(OpenAI error : );
    }
    const data = await res.json() as any;
    return (data?.choices?.[0]?.message?.content || '').trim();
  }
}
