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
async function callLLM(system, user, maxTokens = 8000) {
  if (PROVIDER === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] })
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 250)}`);
    const d = await r.json();
    const txt = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return { text: txt, truncated: d.stop_reason === "max_tokens" };
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
    const c = d.candidates?.[0];
    return { text: (c?.content?.parts || []).map((p) => p.text || "").join("\n"), truncated: c?.finishReason === "MAX_TOKENS" };
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
  const ch = d.choices?.[0];
  return { text: ch?.message?.content || "", truncated: ch?.finish_reason === "length" };
}

// Strip fences, isolate the object, and — if the model was cut off mid-stream —
// close any open strings/brackets so we can still salvage the complete parts.
function repairJSON(str) {
  let out = "", inStr = false, esc = false;
  const stack = [];
  for (const ch of str) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\" && inStr) { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (!inStr) {
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") stack.pop();
    }
    out += ch;
  }
  if (inStr) out += '"';                       // close a dangling string
  out = out.replace(/,\s*$/, "");              // drop a trailing comma
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}

function parseJSON(text) {
  let clean = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = clean.indexOf("{");
  if (a > 0) clean = clean.slice(a);
  try { return JSON.parse(clean); } catch {}
  const b = clean.lastIndexOf("}");
  if (b > 0) { try { return JSON.parse(clean.slice(0, b + 1)); } catch {} }
  return JSON.parse(repairJSON(clean));        // last resort: salvage a truncated response
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


/* ------------- page fact extraction (rendered-ish DOM parse) ------------- */
async function fetchRaw(url) {
  const u = /^https?:\/\//i.test(url) ? url : "https://" + url;
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; MarketingCoPilotBot/1.0)" }, redirect: "follow" });
  return { status: r.status, finalUrl: r.url, html: await r.text() };
}

function extractFacts(html, url) {
  const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : null; };
  const all = (re) => { const out = []; let m; const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); while ((m = r.exec(html))) out.push(m[1]); return out; };

  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
                || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
                 || pick(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const robots = pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const h1s = all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((t) => t.replace(/<[^>]+>/g, "").trim());
  const h2s = all(/<h2[^>]*>([\s\S]*?)<\/h2>/gi).map((t) => t.replace(/<[^>]+>/g, "").trim()).slice(0, 12);
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithAlt = imgTags.filter((t) => /alt=["'][^"']+["']/i.test(t)).length;
  const hreflang = all(/<link[^>]+hreflang=["']([^"']+)["']/gi);
  const jsonld = (html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []).join(" ");
  const schemaTypes = [...new Set((jsonld.match(/"@type"\s*:\s*"([^"]+)"/g) || []).map((t) => t.split('"')[3]))];
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
                   .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const host = (() => { try { return new URL(/^https?:/.test(url) ? url : "https://" + url).host; } catch { return ""; } })();
  const links = all(/<a[^>]+href=["']([^"']+)["']/gi);
  const internal = links.filter((h) => h.startsWith("/") || h.includes(host)).length;

  // is the canonical self-referencing?
  let canonSelf = null;
  if (canonical) { try { canonSelf = new URL(canonical).pathname.replace(/\/$/, "") === new URL(/^https?:/.test(url) ? url : "https://" + url).pathname.replace(/\/$/, ""); } catch { canonSelf = null; } }

  // AEO signals
  const hasFaqSchema = /FAQPage/i.test(jsonld);
  const hasOrgSchema = /"@type"\s*:\s*"Organization"/i.test(jsonld);
  const hasSameAs = /"sameAs"/i.test(jsonld);
  const firstPara = (text.slice(0, 600).match(/[^.]+\.[^.]+\.[^.]+\./) || [""])[0];
  const externalLinks = links.filter((h) => /^https?:\/\//i.test(h) && !h.includes(host)).length;
  const hasTable = /<table[\s>]/i.test(html);

  return {
    title, titleLen: title ? title.length : 0,
    metaDesc, metaDescLen: metaDesc ? metaDesc.length : 0,
    canonical, canonicalSelfReferencing: canonSelf,
    robots, h1Count: h1s.length, h1: h1s[0] || null, h2Sample: h2s,
    images: imgTags.length, imagesWithAlt: imgsWithAlt,
    hreflangTags: hreflang, wordCount: words,
    schemaTypes, hasProductSchema: schemaTypes.includes("Product"),
    hasFaqSchema, hasOrgSchema, hasSameAs, hasBreadcrumb: schemaTypes.includes("BreadcrumbList"),
    internalLinks: internal, externalLinks, hasComparisonTable: hasTable,
    openingText: firstPara, textSample: text.slice(0, 2500)
  };
}

async function fetchRobots(url) {
  try {
    const o = new URL(/^https?:/.test(url) ? url : "https://" + url).origin;
    const r = await fetch(o + "/robots.txt");
    if (!r.ok) return { found: false, aiCrawlers: {} };
    const t = await r.text();
    const bots = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];
    const aiCrawlers = {};
    bots.forEach((b) => { aiCrawlers[b] = new RegExp("User-agent:\\s*" + b, "i").test(t) ? "declared" : "undeclared"; });
    return { found: true, aiCrawlers, hasLlmsTxt: false, raw: t.slice(0, 800) };
  } catch { return { found: false, aiCrawlers: {} }; }
}

async function fetchPSI(url, strategy) {
  try {
    const key = process.env.PAGESPEED_API_KEY;
    const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance${key ? "&key=" + key : ""}`;
    const r = await fetch(u);
    if (!r.ok) return null;
    const d = await r.json();
    const lh = d.lighthouseResult;
    const cr = d.loadingExperience?.metrics || {};
    return {
      score: lh ? Math.round(lh.categories.performance.score * 100) : null,
      lcp: cr.LARGEST_CONTENTFUL_PAINT_MS ? (cr.LARGEST_CONTENTFUL_PAINT_MS.percentile / 1000).toFixed(1) + "s" : lh?.audits?.["largest-contentful-paint"]?.displayValue || null,
      inp: cr.INTERACTION_TO_NEXT_PAINT ? cr.INTERACTION_TO_NEXT_PAINT.percentile + "ms" : null,
      cls: cr.CUMULATIVE_LAYOUT_SHIFT_SCORE ? (cr.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100).toFixed(2) : lh?.audits?.["cumulative-layout-shift"]?.displayValue || null,
      fieldData: !!cr.LARGEST_CONTENTFUL_PAINT_MS
    };
  } catch { return null; }
}

/* ------------------------------ prompts ------------------------------ */
const P = {
  /* ---- Campaign plan: strategy sections (numbers stay calculated) ---- */
  plan: (p) => ({ max: 10000,
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
  brandScan: (p) => ({ max: 1200,
    system: "You extract brand identity from website copy. If the text is thin or missing, say so honestly rather than inventing details.",
    user: `Website: ${p.url}
Page text (may be partial):
"""${(p.pageText || "").slice(0, 7000)}"""

Return ONLY valid JSON:
{"found":true|false,"voice":"","product":"","proof":"","audience":"","note":"if found=false, explain what was missing"}
If the page text is empty or unusable, set found=false and leave the other fields as empty strings.`}),

  /* ---- Content studio ---- */
  content: (p) => {
    const plats = (p.platforms && p.platforms.length) ? p.platforms : ["Meta"];
    const langs = p.langs && p.langs.length ? p.langs : ["en"];
    const perPlat = langs.length > 1 ? "2 English AND 2 Arabic" : (langs[0] === "ar" ? "3 Arabic" : "3 English");
    const wantGoogle = plats.includes("Google");
    return { max: 12000,
    system: "You are a senior UAE performance copywriter and creative director, fluent in English and native Gulf Arabic. Arabic must read as natural UAE marketing Arabic — never a literal translation of the English. You write ONLY for the platforms you are asked for.",
    user: `Brand: ${p.business}
Brand voice: ${p.voice || "confident, warm, direct"}
Brief: ${p.brief || "(none)"} | Offer: ${p.offer || "(none)"}
Objective: ${p.objective} | Location: ${p.location}
Proof available: ${p.proof || "(none)"}

PLATFORMS REQUESTED (write for these and ONLY these): ${plats.join(", ")}
LANGUAGES REQUESTED (write in these and ONLY these): ${langs.map(l => l === "ar" ? "Arabic" : "English").join(" AND ")}
Sections requested: ${(p.types || []).join(", ")}

HARD RULES — follow exactly:
1. Produce ${perPlat} ad variants FOR EACH platform listed above. Set "platform" to the exact platform name and "lang" to "en" or "ar".
2. Do NOT write ads for any platform that is not listed. If Google is not listed, omit "googleRSA" entirely.
3. ${langs.length > 1 ? 'Every platform must have BOTH English and Arabic variants. Arabic is not optional.' : 'Write only in ' + (langs[0] === "ar" ? "Arabic" : "English") + '.'}
4. Respect each platform's native format: Meta = hook headline + 2-3 sentence primary text. TikTok = casual, first-person, native caption. Snapchat = punchy, under-35 tone. LinkedIn = professional, value-led.

Return ONLY valid JSON. Include a key ONLY if it was requested:
{
 "ads":[{"platform":"<exact name from list>","lang":"en|ar","angle":"","headline":"","primary":"","cta":""}]${wantGoogle ? ',\n "googleRSA":{"headlines":["","",""],"descriptions":["",""]}' : ''},
 "hooks":["","","","",""],
 "videoScript":[{"ts":"0–3s","beat":"","say":"","visual":""}],
 "email":{"subject":"","preview":"","body":["",""]},
 "landingCopy":{"headline":"","subhead":"","trustBar":"","cta":""},
 "social":[{"platform":"","caption":"","tags":""}],
 "why":["why these choices work",""]
}` };
  },

  /* ---- YouTube: FULL spoken script ---- */
  youtube: (p) => ({ max: 16000,
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
  email: (p) => ({ max: 12000,
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

  analyse: (p) => ({ max: 16000,
    system: `You are a senior technical SEO auditor and CRO specialist with 20 years' experience, working the UAE market. You are given REAL measured facts about a page. Never invent a fact that isn't in the data — if something wasn't measured, say so. Your judgements must follow from the evidence.

Severity scale: Critical = blocks indexing or rankings. High = measurable traffic loss. Medium = missed opportunity. Low = polish.

You also predict visual attention. You are given the page's structural elements. For each device, lay them out plausibly and score visual saliency (size, contrast, position, isolation), then order the gaze: mobile follows an F-pattern, desktop a Z-pattern. Coordinates are percentages of the viewport (0-100).

Never promise traffic percentages. Auditors who predict "+30% in 8 weeks" are guessing.`,
    user: `Analyse this page.

URL: ${p.url}
Target keyword: ${p.keyword || "(not given)"}
Page type: ${p.pageType} | Market: ${p.market} | Conversion goal: ${p.goal}

MEASURED FACTS (from the fetched page — treat as ground truth):
${JSON.stringify(p.facts, null, 1)}

ROBOTS.TXT / AI CRAWLERS:
${JSON.stringify(p.robots, null, 1)}

CORE WEB VITALS (Google PageSpeed Insights, null = unavailable):
mobile: ${JSON.stringify(p.psiMobile)}
desktop: ${JSON.stringify(p.psiDesktop)}

Return ONLY valid JSON:
{
 "verdict":{"headline":"one sharp sentence","summary":"3-4 sentences a CEO would read","blocker":{"title":"","detail":"","affects":"both|mobile|desktop"}},
 "scores":{"mobile":0-100,"desktop":0-100,
   "categories":[{"name":"Indexability","m":0,"d":0,"deviceAgnostic":true},
                 {"name":"On-page","m":0,"d":0,"deviceAgnostic":true},
                 {"name":"Performance","m":0,"d":0,"deviceAgnostic":false},
                 {"name":"Structured data","m":0,"d":0,"deviceAgnostic":true},
                 {"name":"E-E-A-T","m":0,"d":0,"deviceAgnostic":true},
                 {"name":"AEO / AI","m":0,"d":0,"deviceAgnostic":true},
                 {"name":"Conversion & UX","m":0,"d":0,"deviceAgnostic":false},
                 {"name":"Attention","m":0,"d":0,"deviceAgnostic":false}]},
 "working":["",""],
 "broken":["",""],
 "quickest":"the 20% of work that gets 80% of the result, with a time estimate",
 "attention":{
   "mobile":{"fold":420,"viewport":"390 × 844","aboveFold":"71%","ctaShare":"18%","trustShare":"4%","timeToCta":"2.4s",
     "elements":[{"label":"Product image","x":50,"y":20,"w":92,"h":26,"heat":"high|med|low"}],
     "gaze":[{"n":1,"label":"","note":""}],
     "findings":["",""]},
   "desktop":{"fold":820,"viewport":"1440 × 900","aboveFold":"","ctaShare":"","trustShare":"","timeToCta":"",
     "elements":[{"label":"","x":0,"y":0,"w":0,"h":0,"heat":"high"}],
     "gaze":[{"n":1,"label":"","note":""}],
     "findings":["",""]}},
 "deviceInsight":"one paragraph comparing mobile vs desktop and saying which to fix first, and why",
 "issues":[{"id":1,"issue":"","category":"Index|On-page|Perf|Schema|E-E-A-T|AEO|Mobile|Desktop|CRO",
   "location":"","severity":"Critical|High|Medium|Low","why":"",
   "fixSteps":["",""],"code":"code snippet or empty string","effort":"30m","owner":"Dev|Content|Design"}],
 "aeo":{"score":0,"intro":"why AEO matters for this page",
   "steps":[{"n":1,"title":"","why":"","template":"copy-paste text or empty","code":"code snippet or empty","checks":["",""]}],
   "howToMeasure":""},
 "roadmap":{"quickWins":[{"task":"","severity":"","note":"","effort":"","owner":""}],
   "strategic":[{"task":"","severity":"","note":"","effort":"","owner":""}],
   "backlog":[{"task":"","severity":"","note":"","effort":"","owner":""}]},
 "tracking":[{"metric":"","baseline":"","where":"","expected":""}]
}

Rules:
- Base EVERY issue on the measured facts above. If canonicalSelfReferencing is false, that is Critical. If hreflangTags is empty on a bilingual site, that is Critical.
- Produce 8-18 issues. Include at least 5 AEO issues if AEO signals are weak.
- attention.elements: 6-9 per device, laid out for that viewport. Mobile is single-column; desktop is typically two-column. Coordinates are % of viewport; y beyond the fold is allowed.
- aeo.steps: 5-6 steps, each with a real template or code snippet the user can paste.
- Effort estimates in minutes/hours. Sum the quick wins in "quickest".`}),

  /* ---- n8n workflow ---- */
  n8n: (p) => ({ max: 14000,
    system: `You design n8n workflows. You may ONLY use nodes from this verified library — never invent node types. Always use the exact "type" string and typeVersion given:

${N8N_NODES}

Rules:
- YOU decide which nodes the workflow needs. If the user selected apps, prefer them, but add any others required to make the workflow actually work, and drop ones that aren't needed.
- Not every workflow needs a schedule. If the request implies an incoming event (a message arrives, a form is submitted, a webhook fires), use a webhook trigger. If it's genuinely on-demand, use manualTrigger. Choose what the automation actually requires.
- Every credential value must literally be "REPLACE_ME" — credentials never travel in a workflow file.
- "connections" maps each node's NAME to its downstream nodes.
- Position nodes left-to-right, 220px apart, y=0.
- If the request needs capability outside the library, note it in "unsupported" and build the closest workflow that does work.
- Keep the workflow to the minimum number of nodes that does the job well. Do not pad.`,
    user: `Automation requested: ${p.description}
Trigger preference: ${p.trigger && p.trigger !== "auto" ? p.trigger : "Let the AI decide what trigger this needs"}
Frequency (only if schedule-based): ${p.frequency || "n/a"}
Apps the user selected: ${(p.apps || []).length ? p.apps.join(", ") : "None selected — you choose the nodes this workflow needs"}
Conditions / filtering: ${p.conditions || "none specified"}

Return ONLY valid JSON:
{
 "summary":"2-3 sentences in plain English: what this workflow does, when it runs, and what the user ends up with",
 "howItWorks":["step-by-step explanation of what each node does and why it's there"],
 "nodesChosen":[{"name":"","type":"friendly name e.g. Google Sheets","role":"why this node is in the workflow"}],
 "triggerReason":"one sentence explaining why you chose this trigger type",
 "unsupported":"",
 "flow":[{"name":"","kind":"trigger|action|logic|ai"}],
 "workflow":{"name":"","nodes":[],"connections":{}},
 "manual":[{"step":1,"title":"","body":"","credential":"what REPLACE_ME to swap, or empty"}]
}
"workflow" must be valid, importable n8n JSON. Write one "howItWorks" entry per node. Write 5-7 manual steps ending with test + activate.`}),
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
export default async function handler(req, res_) {
  if (req.method === "GET") {
    const enabled = !!KEY || KEYLESS;
    res_.status(200).json({ aiEnabled: enabled, provider: PROVIDER, model: enabled ? MODEL : null, local: KEYLESS });
    return;
  }
  if (req.method !== "POST") { res_.status(405).json({ error: "Use POST." }); return; }
  if (!KEY && !KEYLESS) {
    res_.status(503).json({ error: "no_key", message: "AI is off. Set LLM_PROVIDER and LLM_API_KEY in your environment variables. For a free local option, set LLM_PROVIDER=ollama." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { type, payload } = body;
    if (!P[type]) { res_.status(400).json({ error: "Unknown type: " + type }); return; }

    const p = { ...payload };

    if (type === "analyse") {
      if (!p.url) { res_.status(400).json({ error: "A page URL is required." }); return; }
      let raw;
      try { raw = await fetchRaw(p.url); }
      catch (e) { res_.status(200).json({ fetchFailed: true, message: "Couldn't fetch that page. It may be blocked, offline, or behind a login." }); return; }
      if (raw.status >= 400) { res_.status(200).json({ fetchFailed: true, message: `The page returned HTTP ${raw.status}. Fix that before auditing anything else.` }); return; }
      p.facts = extractFacts(raw.html, p.url);
      p.facts.httpStatus = raw.status;
      p.robots = await fetchRobots(p.url);
      const [pm, pd] = await Promise.all([fetchPSI(p.url, "mobile"), fetchPSI(p.url, "desktop")]);
      p.psiMobile = pm; p.psiDesktop = pd;
    }

    if (type === "brandScan") {
      if (!p.url) { res_.status(400).json({ error: "A website URL is required." }); return; }
      p.pageText = await fetchPageText(p.url);
      if (!p.pageText || p.pageText.length < 120) {
        res_.status(200).json({ found: false, voice: "", product: "", proof: "", audience: "",
          note: "We couldn't read enough text from that page. It may be JavaScript-rendered or blocked. Add your product brief manually below." });
        return;
      }
    }

    const { system, user, max } = P[type](p);
    let res;
    try {
      res = await callLLM(system, user, max || 8000);
    } catch (err) {
      if (KEYLESS && /fetch failed|ECONNREFUSED|connect|network/i.test(String(err.message))) {
        res_.status(503).json({ error: "ollama_offline",
          message: `Can't reach Ollama at ${OLLAMA_URL}. Run "ollama serve" and make sure the model is pulled:  ollama pull ${MODEL}` });
        return;
      }
      throw err;
    }

    const raw = res.text;
    let json;
    try { json = parseJSON(raw); }
    catch {
      res_.status(200).json({ raw, parseFailed: true, truncated: res.truncated,
        note: res.truncated
          ? "The model ran out of room before finishing. Try a shorter brief, or raise the token limit for this tool in api/generate.js."
          : (KEYLESS ? "The local model returned text that isn't valid JSON. A larger model (qwen2.5:14b or bigger) handles structured output far better." : "The model returned text that isn't valid JSON.") });
      return;
    }
    if (res.truncated) json.truncated = true;

    if (type === "n8n") {
      const errs = validateWorkflow(json.workflow);
      json.validation = { ok: errs.length === 0, errors: errs };
    }

    // Enforce platform + language scope even if the model ignored instructions.
    if (type === "analyse") {
      json.evidence = { facts: p.facts, robots: p.robots, psiMobile: p.psiMobile, psiDesktop: p.psiDesktop };
    }

    if (type === "content") {
      const plats = (p.platforms && p.platforms.length) ? p.platforms : null;
      const langs = (p.langs && p.langs.length) ? p.langs : null;
      if (Array.isArray(json.ads)) {
        json.ads = json.ads.filter((a) =>
          (!plats || plats.some((x) => String(a.platform || "").toLowerCase().includes(x.toLowerCase()))) &&
          (!langs || langs.includes(a.lang))
        );
      }
      if (plats && !plats.includes("Google")) delete json.googleRSA;
      if (langs && !langs.includes("ar")) {
        if (Array.isArray(json.ads)) json.ads = json.ads.filter((a) => a.lang !== "ar");
      }
      json.requestedPlatforms = plats;
      json.requestedLangs = langs;
    }

    res_.status(200).json(json);
  } catch (e) {
    res_.status(500).json({ error: "ai_failed", message: String(e.message || e) });
  }
}
