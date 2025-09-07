export type ModelInfo = {
  id: string;
  label: string;
  description?: string;
};

export const models: ModelInfo[] = [
  {
    id: 'TinyLlama-1.1B-Chat-v0.6-q4f16_1',
    label: 'TinyLlama 1.1B (q4f16_1)',
    description: 'Fast and tiny; great for demos',
  },
  {
    id: 'Phi-3-mini-4k-instruct-q4f16_1',
    label: 'Phi-3 Mini 4K (q4f16_1)',
    description: 'Small, capable instruct model',
  },
  {
    id: 'Qwen2-1.5B-Instruct-q4f16_1',
    label: 'Qwen2 1.5B (q4f16_1)',
    description: 'Quality 1.5B instruct model',
  },
  // You can add larger models like Llama-3-8B but they are heavier for browsers
  // { id: 'Llama-3-8B-Instruct-q4f16_1', label: 'Llama 3 8B (q4f16_1)' }
];

