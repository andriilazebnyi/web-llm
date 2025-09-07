import { useMemo } from 'react';
import * as webllm from '@mlc-ai/web-llm';

export type ModelInfo = { id: string; label: string; description?: string };

export function usePrebuiltModels(): ModelInfo[] {
  return useMemo(() => {
    const list = webllm.prebuiltAppConfig?.model_list ?? [];
    return list.map((m) => ({ id: m.model_id, label: m.model_id }));
  }, []);
}

