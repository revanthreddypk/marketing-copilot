import React from "react";

const Dl = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
);
const Ext = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" /></svg>
);

export default function Docs({ go, ai }) {
  return (
    <div>
      <div className="crumb"><a onClick={() => go("home")}>← All tools</a> <span>/</span> <span>Setup Guide</span></div>

      <div className="card console doc">
        <h2>Add your AI API key</h2>
        <p className="sub">Every tool in this suite runs on your own AI key. It stays on your server and is never exposed to visitors. This takes about two minutes — or you can skip the key entirely and run everything free with Ollama.</p>

        {ai?.aiEnabled
          ? <div className="okbox"><b>✓ AI is connected on this deployment.</b> Provider: <code>{ai.provider}</code> · Model: <code>{ai.model}</code>{ai.local && " · running locally via Ollama"}. Every tool is live.</div>
          : <div className="callout"><b>This deployment is in Free mode.</b> The tools still run, but the AI features are switched off until a key is added. Follow the steps below.</div>}

        <div className="callout"><b>Why your own key?</b> This project is free and open source. Rather than charge you, each person deploys their own copy and pays their AI provider directly — usually a few fils per generation. You stay in full control of cost and data.</div>

        {/* ---------------- Option A ---------------- */}
        <h3>Option A — Hosted on Vercel (recommended)</h3>

        <p><b>Step 1 · Get a key from any provider.</b> Pick whichever you already use — all four work identically.</p>
        <div className="provgrid">
          <div className="prov"><b>Anthropic (Claude)</b><div className="u">console.anthropic.com</div>
            <code>LLM_PROVIDER=anthropic</code><code>LLM_MODEL=claude-sonnet-5</code></div>
          <div className="prov"><b>OpenAI</b><div className="u">platform.openai.com</div>
            <code>LLM_PROVIDER=openai</code><code>LLM_MODEL=gpt-4o-mini</code></div>
          <div className="prov"><b>Google (Gemini)</b><div className="u">aistudio.google.com</div>
            <code>LLM_PROVIDER=google</code><code>LLM_MODEL=gemini-1.5-flash</code></div>
          <div className="prov"><b>Any OpenAI-compatible</b><div className="u">OpenRouter · Groq · Together</div>
            <code>LLM_PROVIDER=compatible</code><code>LLM_BASE_URL=https://…/v1</code></div>
        </div>

        <p><b>Step 2 · Add it to Vercel.</b> In your project, open <b>Settings → Environment Variables</b> and add:</p>
        <table className="envtable">
          <tbody>
            <tr><th>Variable</th><th>Required</th><th>Example value</th></tr>
            <tr><td>LLM_PROVIDER</td><td>Yes</td><td>anthropic</td></tr>
            <tr><td>LLM_API_KEY</td><td>Yes</td><td>sk-ant-…</td></tr>
            <tr><td>LLM_MODEL</td><td>Optional</td><td>claude-sonnet-5</td></tr>
            <tr><td>LLM_BASE_URL</td><td>Only for <code>compatible</code></td><td>https://openrouter.ai/api/v1</td></tr>
          </tbody>
        </table>
        <p>Tick all three environments (Production, Preview, Development) when adding each one.</p>

        <p><b>Step 3 · Redeploy.</b> Environment variables only apply to new builds. Go to <b>Deployments</b>, open the <b>⋯</b> menu on the latest deployment, and choose <b>Redeploy</b>.</p>
        <p>Reload the site. The badge in the top-right flips from <b>Free mode</b> to <b>AI connected</b>. That's it.</p>

        <div className="warn"><b>Never commit your key to GitHub.</b> The repo's <code>.gitignore</code> already excludes <code>.env.local</code>. Only paste the key into Vercel's Environment Variables screen, or into a local <code>.env.local</code> that stays on your machine.</div>

        {/* ---------------- Option B ---------------- */}
        <h3>Option B — Run it free &amp; offline with Ollama</h3>
        <p>No API key. No cost. Nothing leaves your computer — which matters if you're handling client data you can't send to a third party.</p>

        <div className="provgrid">
          <div className="prov free"><b>Ollama (local)</b><div className="u">ollama.com/download · no key needed</div>
            <code>LLM_PROVIDER=ollama</code><code>LLM_MODEL=llama3.1:8b</code><code># leave LLM_API_KEY blank</code></div>
        </div>

        <p><b>Step 1 · Install Ollama</b> from <code>ollama.com/download</code>, then pull a model:</p>
        <div className="termbox"><pre>{`ollama pull llama3.1:8b
ollama serve                 `}<span className="c"># usually starts automatically</span></pre></div>

        <p><b>Step 2 · Point the app at it.</b> Copy <code>.env.example</code> to <code>.env.local</code> and set:</p>
        <div className="termbox"><pre>{`LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b
LLM_API_KEY=                 `}<span className="c"># leave blank — Ollama needs no key</span></pre></div>

        <p><b>Step 3 · Run the app and the API together:</b></p>
        <div className="termbox"><pre>{`npm install
npm i -g vercel
vercel dev                   `}<span className="c"># serves the site + /api on localhost:3000</span></pre></div>

        <div className="warn"><b>Ollama only works when you run this app on your own computer.</b> If you deploy to Vercel and point it at <code>localhost:11434</code>, it will fail — Vercel's servers cannot reach your machine. Hosted deployments need a cloud provider key (Option A).</div>

        <p><b>Model choice matters more than you'd expect.</b> Small models write weaker strategy and produce unreliable JSON. The n8n Workflow Generator in particular needs a stronger model to emit valid, importable workflow files.</p>
        <table className="envtable">
          <tbody>
            <tr><th>Model</th><th>Size</th><th>Good for</th></tr>
            <tr><td>llama3.1:8b</td><td>~5 GB</td><td>General use — the practical floor</td></tr>
            <tr><td>qwen2.5:14b</td><td>~9 GB</td><td>Better strategy + reliable JSON</td></tr>
            <tr><td>gpt-oss:20b</td><td>~13 GB</td><td>Best local quality</td></tr>
          </tbody>
        </table>
        <p>Change models any time by editing <code>LLM_MODEL</code> — no code changes needed.</p>

        {/* ---------------- Troubleshooting ---------------- */}
        <h3>Troubleshooting</h3>
        <p><b>Still says "Free mode."</b> You added the variable but didn't redeploy. Redeploy, then hard-refresh with Cmd/Ctrl + Shift + R.</p>
        <p><b>"AI failed" error.</b> Usually a wrong model name for your provider, or no billing set up on the provider account. Check the model column above.</p>
        <p><b>Works locally, not on Vercel.</b> The variable was added to Preview but not Production. Add it to all three environments.</p>
        <p><b>"Can't reach Ollama."</b> Ollama isn't running. Start it with <code>ollama serve</code> and confirm the model is pulled with <code>ollama list</code>.</p>
        <p><b>Output isn't valid JSON (local models).</b> Your model is too small for structured output. Move up to <code>qwen2.5:14b</code> or larger.</p>

        <h3>Where the key lives</h3>
        <p>Only in <code>api/generate.js</code>, which runs on the server. The browser never sees it — it just calls <code>/api/generate</code>, and the server attaches the key before talking to your provider. That's why this is safe to open-source: the code is public, your key is not.</p>

        <div className="docbtns">
          <a className="p" onClick={() => window.print()}><Dl />Download / print this guide</a>
          <a className="g" href="https://github.com" target="_blank" rel="noopener"><Ext />View on GitHub</a>
        </div>
      </div>
    </div>
  );
}
