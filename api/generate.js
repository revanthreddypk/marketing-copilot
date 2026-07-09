// -----------------------------------------------------------------------------
// api/generate.js — the ONLY server-side file. Holds your API key.
//
// Providers: anthropic | openai | google | compatible | ollama
//   LLM_PROVIDER   which provider to use            (default: anthropic)
//   LLM_API_KEY    your key  (NOT needed for ollama)
//   LLM_MODEL      model id  (sensible default per provider)
//   LLM_BASE_URL   for "compatible", or a custom Ollama host
//
// The key never reaches the browser. Ollama runs locally and needs no key.
// -----------------------------------------------------------------------------

const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
const KEY =
  process.env.LLM_API_KEY ||
  process.env.ANTHROPIC_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  "";
const BASE_URL = process.env.LLM_BASE_URL || "";

const DEFAULT_MODEL = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
  compatible: "gpt-4o-mini",
  ollama: "llama3.1:8b"
};
const MODEL = process.env.LLM_MODEL || DEFAULT_MODEL[PROVIDER] || "claude-sonnet-5";

const KEYLESS = PROVIDER === "ollama";
const OLLAMA_URL = BASE_URL || "http://localhost:11434/v1";

/* ------------------------- provider adapters ------------------------- */
async function callLLM(system, user, maxTokens = 1500) {
  if (PROVIDER === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] })
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 250)}`);
    const d = await r.json();
    return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }

  if (PROVIDER === "google") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      })
    });
    if (!r.ok) throw new Error(`Google ${r.status}: ${(await r.text()).slice(0, 250)}`);
    const d = await r.json();
    return (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
  }

  // openai | compatible | ollama  — all OpenAI chat-completions shaped
  const base =
    PROVIDER === "openai" ? "https://api.openai.com/v1"
    : PROVIDER === "ollama" ? OLLAMA_URL
    : (BASE_URL || "https://api.openai.com/v1");

  const r = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY || "ollama"}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }]
    })
  });
  if (!r.ok) throw new Error(`LLM ${r.status}: ${(await r.text()).slice(0, 250)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

function parseJSON(text) {
  let clean = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
  if (a > 0 || b < clean.length - 1) clean = clean.slice(a, b + 1);
  return JSON.parse(clean);
}

async function fetchPageText(url) {
  try {
    const u = /^https?:\/\//i.test(url) ? url : "https://" + url;
    const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 MarketingCoPilotBot" }, redirect: "follow" });
    const html = await r.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch { return ""; }
}

/* --------------------- verified n8n node library --------------------- */
// The AI composes ONLY from these. Prevents hallucinated node types that
// fail to import. Add more as you verify them against your n8n version.
const N8N_NODES = `
scheduleTrigger | n8n-nodes-base.scheduleTrigger | v1.2 | trigger | params: rule.interval[{triggerAtHour,triggerAtMinute}]
webhook | n8n-nodes-base.webhook | v2 | trigger | params: httpMethod, path
manualTrigger | n8n-nodes-base.manualTrigger | v1 | trigger | params: {}
httpRequest | n8n-nodes-base.httpRequest | v4.2 | action | params: url, method, sendBody, jsonBody
set | n8n-nodes-base.set | v3.4 | action | params: assignments.assignments[{name,value,type}]
if | n8n-nodes-base.if | v2 | logic | params: conditions
code | n8n-nodes-base.code | v2 | logic | params: jsCode
googleSheets | n8n-nodes-base.googleSheets | v4.5 | action | cred: googleSheetsOAuth2Api | params: operation, documentId, sheetName
gmail | n8n-nodes-base.gmail | v2.1 | action | cred: gmailOAuth2 | params: operation, sendTo, subject, message
slack | n8n-nodes-base.slack | v2.2 | action | cred: slackApi | params: select, channelId, text
telegram | n8n-nodes-base.telegram | v1.2 | action | cred: telegramApi | params: chatId, text
airtable | n8n-nodes-base.airtable | v2.1 | action | cred: airtableTokenApi | params: operation, base, table
agent | @n8n/n8n-nodes-langchain.agent | v1.7 | ai | params: promptType, text
merge | n8n-nodes-base.merge | v3 | logic | params: mode
splitInBatches | n8n-nodes-base.splitInBatches | v3 | logic | params: batchSize
`.trim();

/* ------------------------------ prompts ------------------------------ */
const P = {
  /* ---- Campaign plan: strategy sections (numbers stay calculated) ---- */
  plan: (p) => ({ max: 2200,
    system: "You are a senior UAE performance-marketing strategist with 30 years' experience. Write specific, practical strategy for THIS exact business. Never generic filler. Be honest about trade-offs.",
    user: `Build the strategy sections of a paid-media plan.
Business: ${p.business}
Brief: ${p.brief || "(none)"} | Offer: ${p.offer || "(none)"}
Objective: ${p.objective} | Location: ${p.location} | Languages: ${p.language}
Audience: ${p.audience || "(infer)"} | Duration: ${p.weeks} weeks
Budget: AED ${p.budget} ${p.period === "total" ? "total" : "per month"}
Platforms (use these exact keys): ${p.platforms.join(", ")}
Extra context: ${JSON.stringify(p.extra || {})}

Return ONLY valid JSON:
{
 "exec":{"paragraph":"3-4 sentences a CEO would read","bet":"the strategic bet in one line","outcome":"expected outcome"},
 "situation":{"standing":"","market":"","gap":""},
 "kpis":{"primary":{"metric":"","target":"","how":""},"secondary":{"metric":"","target":"","how":""},"diagnostic":{"metric":"","why":""},"notOptimising":""},
 "audiences":[{"name":"","insight":"","message":"","channel":""}],
 "positioning":{"proposition":"","supporting":["",""],"rtb":["",""]},
 "channelRationale":[{"platform":"<key>","why":""}],
 "notDoing":"which platforms we skipped and why",
 "creative":{"concept":"","matrix":[{"segment":"","awareness":"","consideration":"","conversion":""}],"assetCount":""},
 "landing":["",""],
 "testing":[{"priority":"P1","name":"","varies":"","rule":""}],
 "risks":[{"severity":"High|Medium|Low","risk":"","mitigation":"","fallback":""}],
 "optimisation":["",""],
 "nextSteps":[{"action":"","owner":"","when":""}]
}
3 audiences, 3 tests, 3-4 risks, 4-5 landing points, 4-5 optimisation rules, 5 next steps, one channelRationale per platform.`}),

  /* ---- Brand scan from a website ---- */
  brandScan: (p) => ({ max: 700,
    system: "You extract brand identity from website copy. If the text is thin or missing, say so honestly rather than inventing details.",
    user: `Website: ${p.url}
Page text (may be partial):
"""${(p.pageText || "").slice(0, 7000)}"""

Return ONLY valid JSON:
{"found":true|false,"voice":"","product":"","proof":"","audience":"","note":"if found=false, explain what was missing"}
If the page text is empty or unusable, set found=false and leave the other fields as empty strings.`}),

  /* ---- Content studio ---- */
  content: (p) => ({ max: 2600,
    system: "You are a senior UAE performance copywriter and creative director, fluent in English and native Gulf Arabic. Arabic must read as natural UAE marketing Arabic — never a literal translation.",
    user: `Brand: ${p.business}
Brand voice: ${p.voice || "confident, warm, direct"}
Brief: ${p.brief || "(none)"} | Offer: ${p.offer || "(none)"}
Objective: ${p.objective} | Location: ${p.location} | Languages: ${p.language}
Proof available: ${p.proof || "(none)"}
Generate: ${(p.types || []).join(", ")}

Return ONLY valid JSON. Include a key ONLY if requested in "Generate":
{
 "adsMeta":[{"lang":"en|ar","angle":"","headline":"","primary":"","cta":""}],
 "adsGoogle":{"headlines":["",""],"descriptions":["",""]},
 "adsTikTok":{"caption":"","hook":""},
 "hooks":["","","","",""],
 "videoScript":[{"ts":"0–3s","beat":"","say":"","visual":""}],
 "email":{"subject":"","preview":"","body":["",""]},
 "landingCopy":{"headline":"","subhead":"","trustBar":"","cta":""},
 "social":[{"platform":"Instagram|TikTok|X","caption":"","tags":""}],
 "why":["why these choices work",""]
}
For adsMeta produce 2 EN + 2 AR when both languages requested.`}),

  /* ---- YouTube: FULL spoken script ---- */
  youtube: (p) => ({ max: 3000,
    system: "You are a YouTube scriptwriter who writes word-for-word spoken VO that a presenter reads on camera. Write how people actually talk: contractions, short sentences, natural rhythm. Include delivery markers in square brackets like [pause] or [smile]. Never write outlines — write the actual words.",
    user: `Topic: ${p.topic}
Length: ${p.length} | Style: ${p.style} | Tone: ${p.tone}
Audience: ${p.audience || "general"} | Language: ${p.language}
Must cover: ${p.points || "(your call)"}
Call to action: ${p.cta || "(none)"}

Return ONLY valid JSON:
{
 "titles":["A","B"],
 "thumbnail":"text on the thumbnail",
 "wordCount":"approx total",
 "runtime":"e.g. 6:20",
 "sections":[
   {"ts":"0:00–0:08","beat":"Cold open — the hook","words":"approx word count",
    "say":"THE COMPLETE SPOKEN WORDS, word for word, with [pause] markers. Multiple sentences.",
    "visual":"what's on screen","delivery":"how to perform this line","onScreen":"text overlay or 'none'"}
 ],
 "description":"YouTube description paragraph",
 "chapters":"0:00 X · 1:30 Y",
 "tags":"#tag #tag"
}
Write 6-8 sections covering hook, promise, each key point, and outro. The "say" field must be complete readable VO — this is the whole point. Do not summarise it.`}),

  /* ---- Email sequence ---- */
  email: (p) => ({ max: 2800,
    system: "You are an email marketing strategist. You write sequences that respect the reader: no discounting too early, objection before urgency, clean exits. Copy is warm, specific, and short.",
    user: `Business: ${p.business}
Sequence type: ${p.seqType} | Emails: ${p.count} | Trigger: ${p.trigger}
Language: ${p.language} | Tone: ${p.tone} | Export target: ${p.exportFor}
Offer: ${p.offer || "(none)"} | Main objection: ${p.objection || "(none)"}

Return ONLY valid JSON:
{
 "trigger":"machine-readable trigger e.g. cart_abandoned",
 "sendWindow":"e.g. 09:00–20:00 GST",
 "exitRule":"e.g. exit on purchase",
 "schedule":[{"n":1,"delay":"1 hour","subject":"","goal":""}],
 "emails":[{"n":1,"delay":"1 hour","goal":"","subject":"","preview":"","body":["paragraph","paragraph"],"cta":"","exit":"","note":"strategy note, optional"}],
 "why":["why this sequence works",""]
}
Produce exactly ${p.count} emails. Body is an array of paragraphs; use {{first_name}} merge tags.`}),

  /* ---- n8n workflow ---- */
  n8n: (p) => ({ max: 3000,
    system: `You generate n8n workflow JSON. You may ONLY use nodes from this verified library — never invent node types, and always use the exact "type" string and typeVersion given:

${N8N_NODES}

Rules:
- Every credential value must literally be "REPLACE_ME" — credentials never travel in a workflow file.
- "connections" maps each node's NAME to its downstream nodes.
- Position nodes left-to-right, 220px apart, y=0.
- If the request needs a node not in the library, say so in "unsupported" and build the closest valid workflow.`,
    user: `Automation requested: ${p.description}
Trigger: ${p.trigger} | Frequency: ${p.frequency}
Apps: ${(p.apps || []).join(", ")}
Conditions: ${p.conditions || "(none)"}

Return ONLY valid JSON:
{
 "summary":"plain-English description of what it does",
 "unsupported":"" ,
 "flow":[{"name":"","kind":"trigger|action|logic|ai"}],
 "workflow":{"name":"","nodes":[],"connections":{}},
 "manual":[{"step":1,"title":"","body":"","credential":"what REPLACE_ME to swap, or empty"}]
}
The "workflow" object must be valid, importable n8n JSON. Write 5-7 manual steps ending with test + activate.`})
};

/* ---------------- n8n validation before we hand it over ---------------- */
const ALLOWED_TYPES = N8N_NODES.split("\n").map((l) => l.split("|")[1].trim());
function validateWorkflow(wf) {
  const errs = [];
  if (!wf || typeof wf !== "object") return ["Workflow missing."];
  if (!Array.isArray(wf.nodes) || !wf.nodes.length) errs.push("No nodes array.");
  if (!wf.connections || typeof wf.connections !== "object") errs.push("No connections object.");
  const names = new Set();
  (wf.nodes || []).forEach((n, i) => {
    if (!n.name) errs.push(`Node ${i} has no name.`);
    if (!n.type) errs.push(`Node ${n.name || i} has no type.`);
    else if (!ALLOWED_TYPES.includes(n.type)) errs.push(`Unverified node type: ${n.type}`);
    if (n.typeVersion === undefined) errs.push(`Node ${n.name} missing typeVersion.`);
    names.add(n.name);
  });
  Object.entries(wf.connections || {}).forEach(([from, c]) => {
    if (!names.has(from)) errs.push(`Connection from unknown node: ${from}`);
    (c.main || []).flat().forEach((t) => {
      if (t && t.node && !names.has(t.node)) errs.push(`Connection to unknown node: ${t.node}`);
    });
  });
  return errs;
}

/* ------------------------------ handler ------------------------------ */
export default async function handler(req, res) {
  if (req.method === "GET") {
    const enabled = !!KEY || KEYLESS;
    res.status(200).json({ aiEnabled: enabled, provider: PROVIDER, model: enabled ? MODEL : null, local: KEYLESS });
    return;
  }
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }
  if (!KEY && !KEYLESS) {
    res.status(503).json({ error: "no_key", message: "AI is off. Set LLM_PROVIDER and LLM_API_KEY in your environment variables. For a free local option, set LLM_PROVIDER=ollama." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { type, payload } = body;
    if (!P[type]) { res.status(400).json({ error: "Unknown type: " + type }); return; }

    const p = { ...payload };
    if (type === "brandScan") {
      if (!p.url) { res.status(400).json({ error: "A website URL is required." }); return; }
      p.pageText = await fetchPageText(p.url);
      if (!p.pageText || p.pageText.length < 120) {
        res.status(200).json({ found: false, voice: "", product: "", proof: "", audience: "",
          note: "We couldn't read enough text from that page. It may be JavaScript-rendered or blocked. Add your product brief manually below." });
        return;
      }
    }

    const { system, user, max } = P[type](p);
    let raw;
    try {
      raw = await callLLM(system, user, max || 1500);
    } catch (err) {
      if (KEYLESS && /fetch failed|ECONNREFUSED|connect|network/i.test(String(err.message))) {
        res.status(503).json({ error: "ollama_offline",
          message: `Can't reach Ollama at ${OLLAMA_URL}. Run "ollama serve" and make sure the model is pulled:  ollama pull ${MODEL}` });
        return;
      }
      throw err;
    }

    let json;
    try { json = parseJSON(raw); }
    catch {
      res.status(200).json({ raw, parseFailed: true,
        note: KEYLESS ? "The local model returned text that isn't valid JSON. A larger model (qwen2.5:14b or bigger) handles structured output far better." : "The model returned text that isn't valid JSON." });
      return;
    }

    if (type === "n8n") {
      const errs = validateWorkflow(json.workflow);
      json.validation = { ok: errs.length === 0, errors: errs };
    }

    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: "ai_failed", message: String(e.message || e) });
  }
}
