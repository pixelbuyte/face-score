import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./error-boundary";
import "./index.css";

const el = document.getElementById("root");
if (!el) {
  throw new Error("Missing #root");
}

ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
