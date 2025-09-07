import { useEffect, useState } from 'react';

export type WebGPUInfo = {
  supported: boolean;
  adapter: string;
  features: string[];
  error?: string;
};

export function useWebGPU(): WebGPUInfo {
  const [info, setInfo] = useState<WebGPUInfo>({ supported: false, adapter: '', features: [] });

  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (!supported) {
      setInfo({ supported: false, adapter: '', features: [], error: 'WebGPU not detected' });
      return;
    }
    (async () => {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
          setInfo({ supported: false, adapter: '', features: [], error: 'No compatible adapter' });
          return;
        }
        const features = Array.from((adapter.features as any)?.values?.() ?? []);
        const name = (adapter as any).name || 'GPU';
        setInfo({ supported: true, adapter: String(name), features: features.map(String) });
      } catch (e) {
        setInfo({ supported: false, adapter: '', features: [], error: (e as Error).message });
      }
    })();
  }, []);

  return info;
}
