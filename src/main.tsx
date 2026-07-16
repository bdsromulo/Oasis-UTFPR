import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./index.css";
import { App } from "./ui/App";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
