export type Role = 'user' | 'assistant' | 'system';
export type ChatMessage = { role: Role; content: string };

export interface LLMProvider { chat(messages: ChatMessage[]): Promise<string>; }
