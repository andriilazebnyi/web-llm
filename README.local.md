Web LLM Starter (React + Vite)

Run small LLMs fully in your browser via WebGPU using WebLLM.

Quickstart
- Prereqs: Node 18+, Chrome/Edge (WebGPU), good GPU.
- Install: `npm i` (or `pnpm i`/`yarn`)
- Dev: `npm run dev` then open the printed URL.
- Build: `npm run build` and `npm run preview`.

Notes
- First load downloads model artifacts (hundreds of MB). They are cached for subsequent runs.
- Model menu defaults to tiny options (1–2B params) for smoother UX. Larger models may be slow or fail on low‑VRAM GPUs.
- If WASM multithreading is required by your browser, consider serving with COOP/COEP headers.

Troubleshooting
- “WebGPU not supported”: Enable chrome://flags/#enable-unsafe-webgpu or update your browser/OS/GPU drivers.
- “Failed to compile/initialize”: Try a smaller model, and use the “Clear caches” button to remove stale artifacts.
- Dev server CORS/isolation: Vite works out of the box for WebGPU. For strict WASM threading you may add COOP/COEP headers via a proxy or plugin.

Project Structure
- `src/ui/model/useEngine.ts`: Loads models and generates text.
- `src/ui/model/models.ts`: Model presets. Adjust as needed.
- `src/ui/chat/*`: Chat state and UI.
- `src/utils/useIndexedDB.ts`: Minimal IndexedDB helper used to persist chats per model.

