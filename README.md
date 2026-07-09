# 🚀 Marketing Co-Pilot

**An open-source AI marketing suite.** Five tools that turn a brief into launch-ready work: campaign plans, n8n workflows, YouTube scripts, email sequences and ad copy.

Bring your own AI key — **or run the whole thing free and offline with [Ollama](https://ollama.com)**. Your key never touches the browser.

> Built and open-sourced by **Revanth** — digital marketing & AI automation, UAE.
> Portfolio: _add link_ · LinkedIn: _add link_

---

## 🧰 The tools

| Tool | What it does |
|---|---|
| **Campaign Planning** | A 15-section plan: exec summary, situation analysis, KPIs, audience strategy, positioning, budget split, creative matrix, testing roadmap, risk register, assumptions, next steps. Plus a **Content tab** that reads your website and writes in your brand voice. |
| **n8n Workflow Generator** | Describe an automation → importable n8n JSON **validated against a verified node library** + a step-by-step manual for connecting every node. |
| **YouTube Script Generator** | Complete word-for-word spoken VO with timestamps, delivery notes, on-screen text and b-roll direction. Export as `.txt`. |
| **Email Sequence Builder** | Triggers, delays, subject lines, full body copy, exit rules. Export CSV or JSON for Klaviyo / Mailchimp / n8n. |
| **Ad Copy Generator** | Scans a website, learns the brand voice, writes platform-ready copy in English and native Arabic. |

**Numbers are calculated, not generated.** Budget splits and benchmarks come from `src/lib/logic.js` — never from the model. Language models hallucinate figures; the plan's credibility depends on them being real.

---

## 🖱️ Deploy in 15 minutes

1. **Fork / clone** this repo and push it to your GitHub.
2. **Import it on [Vercel](https://vercel.com)** → *Add New → Project* → Deploy. Vercel auto-detects Vite.
3. **Add your key** → Project → *Settings → Environment Variables* (see below) → *Deployments → ⋯ → Redeploy*.

The badge in the top-right flips from **Free mode** to **AI connected**. Done.

---

## 🔑 Provider settings

| Variable | Required | Example |
|---|---|---|
| `LLM_PROVIDER` | ✅ | `anthropic` · `openai` · `google` · `compatible` · `ollama` |
| `LLM_API_KEY` | ✅ (not for `ollama`) | `sk-ant-…` |
| `LLM_MODEL` | ⬜ | `claude-sonnet-5` · `gpt-4o-mini` · `gemini-1.5-flash` · `llama3.1:8b` |
| `LLM_BASE_URL` | only for `compatible` / custom Ollama host | `https://openrouter.ai/api/v1` |

Tick **all three environments** (Production, Preview, Development) when adding each variable.

---

## 🖥️ Run it 100% free & offline with Ollama

No API key. No cost. Nothing leaves your machine — useful for client data you can't send to a third party.

```bash
# 1. Install Ollama → https://ollama.com/download
ollama pull llama3.1:8b

# 2. Copy .env.example → .env.local and set:
#      LLM_PROVIDER=ollama
#      LLM_MODEL=llama3.1:8b
#      (leave LLM_API_KEY blank)

# 3. Run the site + the /api function together
npm install
npm i -g vercel
vercel dev
```

**Two things to know:**

- ⚠️ **Ollama only works when you run the app on your own computer.** A Vercel deployment cannot reach `localhost` on your machine — hosted sites need a cloud key.
- **Model size matters.** Small models write weaker strategy and unreliable JSON. The n8n generator in particular needs a stronger model to emit valid workflows.

| Model | Size | Good for |
|---|---|---|
| `llama3.1:8b` | ~5 GB | General use — the practical floor |
| `qwen2.5:14b` | ~9 GB | Better strategy + reliable JSON |
| `gpt-oss:20b` | ~13 GB | Best local quality |

---

## 💻 Local development

```bash
npm install
npm run dev        # http://localhost:5173 — free planner works immediately
vercel dev         # also serves /api so the AI tools work
```

---

## 🎛️ Make it yours

| File | What lives there |
|---|---|
| `src/lib/data.js` | Platforms, benchmark CPM/CPC ranges, targeting templates, UAE compliance rules. **Tune the benchmarks to your own account data.** |
| `src/lib/logic.js` | How the plan is calculated — budget split, weekly phases, assumptions. |
| `api/generate.js` | Every AI prompt, the provider adapters, and the **verified n8n node library**. |
| `src/App.jsx` | `PORTFOLIO_URL`, `LINKEDIN_URL`, `GITHUB_URL` at the top. |
| `src/styles.css` | Theme colours as CSS variables. |

**Adding an n8n node:** append a line to `N8N_NODES` in `api/generate.js` with its exact `type` and `typeVersion`. The validator uses that list to reject anything hallucinated.

---

## 📁 Structure

```
marketing-copilot/
├── api/generate.js        # serverless AI — holds your key, all 6 endpoints
├── src/
│   ├── App.jsx            # shell + hash routing
│   ├── pages/             # Home, Docs, Planner, N8n, YouTube, Email, AdCopy
│   ├── lib/               # api.js · ui.jsx · data.js · logic.js
│   └── styles.css
├── index.html · vercel.json · .env.example · package.json
```

---

## ⚠️ Notes

- Benchmark figures are **planning estimates** for the UAE market, not guarantees. Tune them.
- Arabic copy is AI-generated — have a native speaker review before a real launch.
- The brand scan reads a page's **text** server-side. Sites rendered entirely in JavaScript may return little; the tool says so rather than inventing a brand.
- n8n node schemas change between versions. The validator checks against the library in `api/generate.js` — update it to match your n8n instance.
- The email tool **generates** sequences; sending happens in your own email platform.

## 📄 License

MIT — do whatever you like, attribution appreciated. Built by Revanth.
