import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import "./styles.css";

const env = import.meta.env;
const root = document.getElementById("root")!;

function SetupRequired() {
  return <main className="setup-screen"><div className="setup-card"><div className="brand-mark">N</div><h1>Connect your app services</h1><p>Set <code>VITE_CONVEX_URL</code> and <code>VITE_CONVEX_SITE_URL</code> in <code>app/.env.local</code>, then restart the hosted app.</p><p>The local file-based app remains available at port 4173.</p></div></main>;
}

if (!env.VITE_CONVEX_URL || !env.VITE_CONVEX_SITE_URL) {
  ReactDOM.createRoot(root).render(<SetupRequired />);
} else {
  const convex = new ConvexReactClient(env.VITE_CONVEX_URL);
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </React.StrictMode>,
  );
}
