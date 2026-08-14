import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installStandaloneViewportFix } from "@/lib/standaloneViewport";
import "@/styles/fonts.css";
import "./index.css";

installStandaloneViewportFix();

createRoot(document.getElementById("root")!).render(<App />);
