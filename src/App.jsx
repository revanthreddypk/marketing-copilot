import React, { useState, useEffect } from "react";
import { checkAI } from "./lib/api.js";
import Home from "./pages/Home.jsx";
import Docs from "./pages/Docs.jsx";
import Planner from "./pages/Planner.jsx";
import N8n from "./pages/N8n.jsx";
import YouTube from "./pages/YouTube.jsx";
import Email from "./pages/Email.jsx";
import AdCopy from "./pages/AdCopy.jsx";
import Analyser from "./pages/Analyser.jsx";

// ─── Put your links here ────────────────────────────────────────────────
const LINKEDIN_URL = "https://www.linkedin.com/in/YOUR-LINKEDIN-HANDLE";  // ← set this
const GITHUB_URL   = "https://github.com/revanthreddypk/marketing-copilot";
// ────────────────────────────────────────────────────────────────────────

const PAGES = { home: Home, docs: Docs, planner: Planner, n8n: N8n, youtube: YouTube, email: Email, adcopy: AdCopy, analyser: Analyser };

export default function App() {
  const [page, setPage] = useState("home");
  const [ai, setAi] = useState(null);

  useEffect(() => { checkAI().then(setAi); }, []);
  useEffect(() => {
    const fromHash = () => setPage(PAGES[location.hash.slice(1)] ? location.hash.slice(1) : "home");
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const go = (p) => { location.hash = p === "home" ? "" : p; setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const Page = PAGES[page] || Home;

  const status = ai === null ? "Checking…" : ai.aiEnabled ? (ai.local ? "AI connected · local" : "AI connected") : "Free mode";

  return (
    <div className="wrap">
      <div className="top">
        <div className="brand" onClick={() => go("home")}>
          <div className="mark" aria-hidden="true" />
          <div><div className="ey">Open-source AI marketing suite</div><h1>Marketing Co-Pilot</h1></div>
        </div>
        <div className="hnav">
          <a className="docbtn" onClick={() => go("docs")}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            Setup Guide — Add your API key
          </a>
          <div className="byline"><span className={"dot" + (ai?.aiEnabled ? "" : " off")} />{status}</div>
        </div>
      </div>

      <Page go={go} ai={ai} />

      <div className="hire">
        <div className="txt">
          <div className="ey">Built &amp; open-sourced by Revanth</div>
          <h4>Fork it, add your key, ship it.</h4>
          <p>An open-source AI marketing suite. Clone the repo, add any AI provider's key — or run it free with Ollama — and deploy to Vercel in minutes. Built by a digital-marketing &amp; AI-automation professional in the UAE.</p>
        </div>
        <div className="cta-row">
          <a className="primary" href={LINKEDIN_URL} target="_blank" rel="noopener">LinkedIn</a>
          <a className="ghost" href={GITHUB_URL} target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>

      <div className="foot">Free &amp; open source · estimates are planning aids, not guarantees · MIT licensed</div>
    </div>
  );
}
