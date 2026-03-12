import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Supabase client is created centrally in `src/lib/supabase.ts` and should
// be imported where needed. Avoid attaching to `window` to keep the global
// namespace clean and to prevent accidental test/build issues.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
