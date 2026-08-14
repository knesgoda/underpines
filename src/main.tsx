import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installStandaloneViewportFix } from "@/lib/standaloneViewport";
import { runForceRefresh } from "@/lib/forceRefresh";
import "@/styles/fonts.css";
import "./index.css";

// A pending one-shot purge reloads the page; don't paint the stale bundle.
if (!runForceRefresh()) {
  installStandaloneViewportFix();
  createRoot(document.getElementById("root")!).render(<App />);
}
