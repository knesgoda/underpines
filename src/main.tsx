import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@/styles/fonts.css";
import "./index.css";
import "@/styles/SeasonalLayer.css";

createRoot(document.getElementById("root")!).render(<App />);
