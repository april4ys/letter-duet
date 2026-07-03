import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

async function startApp() {
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}firebase-config.json`,
      { cache: "no-store" },
    );

    if (response.ok) {
      window.FIREBASE_CONFIG = await response.json() as FirebaseRuntimeConfig;
    }
  } catch {
    // Local builds can continue with Vite environment variables.
  }

  const { default: App } = await import("./App");

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void startApp();
