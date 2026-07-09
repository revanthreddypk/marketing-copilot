import React, { useState } from "react";
import { PLATFORMS, OBJECTIVES, LANGUAGES, CONTENT_TYPES } from "../lib/data.js";
import { generatePlan, fmt } from "../lib/logic.js";
import { generate } from "../lib/api.js";
import { Block, Field, Checks, BuildBtn, ErrBox, Loader, Empty, Check, Spark, KeyBanner, CopyBtn } from "../lib/ui.jsx";

const PLAT_LABELS = Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, v.short]));
const OBJ_OPTS = Object.entries(OBJECTIVES).map(([k, v]) => [k, v.label]);

export default function Planner({ go, ai }) {
  const [f, setF] = useState({
    business: "", budget: "12000", period: "monthly", location: "Dubai, UAE",
    objective: "sales", platforms: ["meta", "google", "tiktok"], language: "both",
    audience: "", website: "", brief: "", offer: "", weeks: "6"
  });
  const [x, setX] = useState({
    targetKPI: "", aov: "", margin: "", currentCPA: "", canScale: "yes", deadline: "",
    cycle: "considered", hasList: "no", triggers: "", competitors: "", tried: "", proof: "",
    pixel: "yes", canEditLP: "yes", capacity: "yes", restrictions: ""
  });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [plan, setPlan] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Content tab
  const [brandUrl, setBrandUrl] = useState("");
  const [brand, setBrand] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cBrief, setCBrief] = useState("");
  const [cTypes, setCTypes] = useState(Object.keys(CONTENT_TYPES));
  const [content, setContent] = useState(null);
  const [cLoading, setCLoading] = useState(false);
  const [cErr, setCErr] = useState("");
  const [adLang, setAdLang] = useState("en");

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setEx = (k, v) => setX((s) => ({ ...s, [k]: v }));

  const inputs = () => ({
    ...f, budget: parseFloat(f.budget) || 0, weeks: parseInt(f.weeks) || 4,
    business: f.business.trim(), location: f.location.trim(), audience: f.audience.trim(), offer: f.offer.trim(),
    extra: Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "" && v !== undefined))
  });

  async function build() {
    if (!f.business.trim()) return setErr("Add your business name and what it does.");
    if (!(parseFloat(f.budget) > 0)) return setErr("Add a budget above zero.");
    if (!f.platforms.length) return setErr("Pick at least one platform.");
    setErr(""); setLoading(true); setPlan(null); setAiPlan(null); setContent(null);
    if (!brandUrl && f.website) setBrandUrl(f.website);
    if (!cBrief && f.brief) setCBrief(f.brief);

    const inp = inputs();
    const local = generatePlan(inp);

    if (ai?.aiEnabled) {
      try {
        const d = await generate("plan", {
          business: inp.business, brief: inp.brief, offer: inp.offer,
          objective: OBJECTIVES[inp.objective].label, audience: inp.audience,
          location: inp.location, language: LANGUAGES[inp.language],
          platforms: inp.platforms, budget: inp.budget, period: inp.period, weeks: inp.weeks, extra: inp.extra
        });
        if (!d.parseFailed) setAiPlan(d);
      } catch (e) { setErr("AI step failed — showing the calculated plan. " + e.message); }
    } else {
      await new Promise((r) => setTimeout(r, 700));
    }
    setPlan(local); setLoading(false);
    setTimeout(() => {
      document.querySelectorAll(".fill").forEach((el) => (el.style.width = el.dataset.w + "%"));
      document.querySelector(".out")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 90);
  }

  async function scan() {
    if (!brandUrl.trim()) return setCErr("Add a website URL first.");
    setCErr(""); setScanning(true); setBrand(null);
    try { setBrand(await generate("brandScan", { url: brandUrl.trim() })); }
    catch (e) { setCErr(e.message); }
    setScanning(false);
  }

  async function genContent() {
    if (!cTypes.length) return setCErr("Pick at least one content type.");
    setCErr(""); setCLoading(true); setContent(null);
    try {
      const inp = inputs();
      const langs = inp.language === "both" ? ["en", "ar"] : [inp.language];
      const platNames = inp.platforms.map((k) => PLATFORMS[k].short);
      setContent(await generate("content", {
        business: inp.business, voice: brand?.voice, proof: brand?.proof || x.proof,
        brief: cBrief || inp.brief, offer: inp.offer,
        objective: OBJECTIVES[inp.objective].label, location: inp.location,
        platforms: platNames, langs,
        types: cTypes.map((t) => CONTENT_TYPES[t])
      }));
      setAdLang(langs[0]);
    } catch (e) { setCErr(e.message); }
    setCLoading(false);
  }

  const S = aiPlan || {};
  const fb = plan?.fallback || {};
  const pick = (a, b) => (a !== undefined && a !== null && (!Array.isArray(a) || a.length) ? a : b);

  return (
    <div>
      <div className="crumb"><a onClick={() => go("home")}>← All tools</a> <span>/</span> <span>Campaign Planning</span></div>
      {!ai?.aiEnabled && <KeyBanner onDocs={() => go("docs")} />}

      {/* -------- FORM -------- */}
      <div className="card console">
        <div className="hd"><span className="tag">Brief</span><h3>Campaign inputs</h3></div>
        <div className="form-grid">
          <Field label="Business — name & what it does" req full>
            <input type="text" value={f.business} onChange={(e) => set("business", e.target.value)} placeholder="e.g. Nova Interiors — home fit-out studio" /></Field>
          <Field label="Budget (AED)" req><input type="number" min="0" step="500" value={f.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
          <Field label="Period"><select value={f.period} onChange={(e) => set("period", e.target.value)}>
            <option value="monthly">Per month</option><option value="total">Total for run</option></select></Field>
          <Field label="Target location" req><input type="text" value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Duration (weeks)"><input type="number" min="1" max="12" value={f.weeks} onChange={(e) => set("weeks", e.target.value)} /></Field>
          <Field label="Objective" req><select value={f.objective} onChange={(e) => set("objective", e.target.value)}>
            {OBJ_OPTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Language"><select value={f.language} onChange={(e) => set("language", e.target.value)}>
            {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="f spanfull"><span className="lblspan">Platforms <b className="req">*</b></span>
            <Checks options={PLAT_LABELS} value={f.platforms} onChange={(v) => set("platforms", v)} /></div>
          <Field label="Target audience"><input type="text" value={f.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. villa owners 30–55 renovating" /></Field>
          <Field label="Website / landing link"><input type="text" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Offer (optional)"><input type="text" value={f.offer} onChange={(e) => set("offer", e.target.value)} placeholder="e.g. Free consult + 10% off" /></Field>
          <Field label="Product / brief" full><textarea value={f.brief} onChange={(e) => set("brief", e.target.value)} placeholder="A few lines on what you sell and why people buy it." /></Field>
        </div>

        <div className={"sharpen" + (open ? " open" : "")}>
          <button className="sh-toggle" onClick={() => setOpen(!open)}>
            <span className="sh-l"><span className="sic"><Spark /></span>
              <span><b>Sharpen my plan (optional)</b><small>15 extra fields. Every one you fill makes the output measurably better.</small></span></span>
            <svg className="sh-caret" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <div className="sh-body">
            <div className="sh-group"><h5>Commercial reality</h5><div className="form-grid">
              <Field label="Success metric & target"><input type="text" value={x.targetKPI} onChange={(e) => setEx("targetKPI", e.target.value)} placeholder="e.g. 3x ROAS" /></Field>
              <Field label="Average order value (AED)"><input type="number" value={x.aov} onChange={(e) => setEx("aov", e.target.value)} placeholder="180" /></Field>
              <Field label="Gross margin (%)"><input type="number" value={x.margin} onChange={(e) => setEx("margin", e.target.value)} placeholder="60" /></Field>
              <Field label="Current CPA / CPL (AED)"><input type="number" value={x.currentCPA} onChange={(e) => setEx("currentCPA", e.target.value)} placeholder="45" /></Field>
              <Field label="Can budget scale if it works?"><select value={x.canScale} onChange={(e) => setEx("canScale", e.target.value)}><option value="yes">Yes — scale on performance</option><option value="no">No — fixed budget</option></select></Field>
              <Field label="Hard deadline / seasonal peak"><input type="text" value={x.deadline} onChange={(e) => setEx("deadline", e.target.value)} placeholder="Ramadan, DSF, launch…" /></Field>
            </div></div>
            <div className="sh-group"><h5>Audience depth</h5><div className="form-grid">
              <Field label="Decision cycle"><select value={x.cycle} onChange={(e) => setEx("cycle", e.target.value)}><option value="impulse">Impulse (same day)</option><option value="considered">Considered (1–2 weeks)</option><option value="long">Long (1 month+)</option></select></Field>
              <Field label="Customer list / CRM data?"><select value={x.hasList} onChange={(e) => setEx("hasList", e.target.value)}><option value="yes">Yes — can upload</option><option value="no">No</option></select></Field>
              <Field label="Purchase triggers & main objections" full><textarea value={x.triggers} onChange={(e) => setEx("triggers", e.target.value)} placeholder="What makes them buy? What stops them?" /></Field>
            </div></div>
            <div className="sh-group"><h5>Proof & market</h5><div className="form-grid">
              <Field label="Top competitors"><input type="text" value={x.competitors} onChange={(e) => setEx("competitors", e.target.value)} placeholder="Comma separated" /></Field>
              <Field label="What have you already tried?"><input type="text" value={x.tried} onChange={(e) => setEx("tried", e.target.value)} placeholder="e.g. Meta ads, ~2x ROAS" /></Field>
              <Field label="Proof you can use" full><textarea value={x.proof} onChange={(e) => setEx("proof", e.target.value)} placeholder="Reviews, ratings, case studies, guarantees" /></Field>
            </div></div>
            <div className="sh-group"><h5>Readiness & constraints</h5><div className="form-grid">
              <Field label="Pixel / CAPI installed?"><select value={x.pixel} onChange={(e) => setEx("pixel", e.target.value)}><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Not sure</option></select></Field>
              <Field label="Can you change the landing page?"><select value={x.canEditLP} onChange={(e) => setEx("canEditLP", e.target.value)}><option value="yes">Yes</option><option value="no">No — locked</option></select></Field>
              <Field label="Can you service the demand?"><select value={x.capacity} onChange={(e) => setEx("capacity", e.target.value)}><option value="yes">Yes — ready</option><option value="limited">Limited capacity</option></select></Field>
              <Field label="Restrictions / blackout topics" full><input type="text" value={x.restrictions} onChange={(e) => setEx("restrictions", e.target.value)} placeholder="Tone limits, claims you can't make" /></Field>
            </div></div>
          </div>
        </div>

        <ErrBox>{err}</ErrBox>
        <BuildBtn loading={loading} onClick={build} label="Build my plan" loadingLabel={ai?.aiEnabled ? "The AI is building your plan…" : "Building your plan…"} />
        <p className="buildnote">{ai?.aiEnabled ? "AI writes the strategy. The numbers stay calculated." : "Runs free in your browser. Connect a key for AI-written strategy."}</p>
      </div>

      {/* -------- OUTPUT -------- */}
      <div className="out">
        {loading && <Loader text={ai?.aiEnabled ? "The AI is building your plan…" : "Building your plan…"} />}
        {!loading && !plan && <Empty
          icon={<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-6" /></svg>}
          title="Your plan will appear here" sub="Fill in the brief above and press Build my plan." />}

        {!loading && plan && <>
          <div className="tabbar">
            <button className={tab === "overview" ? "on" : ""} onClick={() => { setTab("overview"); setTimeout(() => document.querySelectorAll(".fill").forEach((el) => (el.style.width = el.dataset.w + "%")), 80); }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-6" /></svg>Overview</button>
            <button className={tab === "content" ? "on" : ""} onClick={() => setTab("content")}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>Content</button>
          </div>

          {tab === "overview" && <Overview plan={plan} S={S} fb={fb} pick={pick} hasAI={!!aiPlan} />}

          {tab === "content" && (
            <div className="plan">
              <div className="card console">
                <div className="hd"><span className="tag">Brand</span><h3>Content studio</h3></div>
                {!ai?.aiEnabled && <KeyBanner onDocs={() => go("docs")} text={<><b>The content studio needs an API key.</b> It reads your website to learn the brand voice, then writes in it. </>} />}
                <div className="brandbar">
                  <Field label="Website — we'll read it to learn your brand voice">
                    <input type="text" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} placeholder="https://yourbrand.ae" /></Field>
                  <button className="scan" onClick={scan} disabled={scanning || !ai?.aiEnabled}>
                    {scanning ? <span className="spin" /> : <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>}
                    {scanning ? "Reading…" : "Scan website"}</button>
                </div>

                {brand && (brand.found === false
                  ? <div className="brandcard miss"><b>Couldn't read that page</b>{brand.note}</div>
                  : <div className="brandcard"><b>✓ Brand learned from {brandUrl}</b>
                      <div className="bc-grid">
                        {brand.voice && <div className="bc"><small>Voice</small>{brand.voice}</div>}
                        {brand.product && <div className="bc"><small>Product</small>{brand.product}</div>}
                        {brand.proof && <div className="bc"><small>Proof found</small>{brand.proof}</div>}
                        {brand.audience && <div className="bc"><small>Audience signal</small>{brand.audience}</div>}
                      </div></div>)}

                <Field label="Product brief — add details, or edit what we found" full>
                  <textarea style={{ minHeight: 100 }} value={cBrief} onChange={(e) => setCBrief(e.target.value)} placeholder="What you're selling and why people buy it." /></Field>
                <div className="f"><span className="lblspan">What should we generate?</span>
                  <Checks options={CONTENT_TYPES} value={cTypes} onChange={setCTypes} /></div>
                <ErrBox>{cErr}</ErrBox>
                <BuildBtn loading={cLoading} onClick={genContent} label="Generate content" loadingLabel="Writing in your brand voice…" />
              </div>

              {cLoading && <Loader text="Writing in your brand voice…" />}
              {content && <ContentOut c={content} adLang={adLang} setAdLang={setAdLang} />}
            </div>
          )}
        </>}
      </div>
    </div>
  );
}

/* ---------------- Overview: the 15 sections ---------------- */
function Overview({ plan, S, fb, pick, hasAI }) {
  const ex = pick(S.exec, fb.exec) || {};
  const si = pick(S.situation, fb.situation) || {};
  const k = pick(S.kpis, fb.kpis) || {};
  const auds = pick(S.audiences, fb.audiences) || [];
  const pos = pick(S.positioning, fb.positioning) || {};
  const chan = pick(S.channelRationale, fb.channelRationale) || [];
  const cre = pick(S.creative, fb.creative) || {};
  const land = pick(S.landing, plan.landing) || [];
  const tests = pick(S.testing, fb.testing) || [];
  const risks = pick(S.risks, fb.risks) || [];
  const opt = pick(S.optimisation, plan.optimisation) || [];
  const steps = pick(S.nextSteps, plan.nextSteps) || [];
  const sev = (s) => (/high|p1/i.test(s) ? "hi" : /med|p2/i.test(s) ? "md" : "lo");

  return (
    <div className="plan">
      <Block n="1" title="Executive summary" ai={hasAI}>
        <p className="exec">{ex.paragraph}</p>
        <div className="kv">
          <span className="k">Strategic bet</span><span>{ex.bet}</span>
          <span className="k">Expected outcome</span><span>{ex.outcome}</span>
        </div>
      </Block>

      <Block n="2" title="Situation analysis" ai={hasAI}>
        <div className="stack"><div className="stack-h">Where you stand</div><p className="ptxt">{si.standing}</p></div>
        <div className="stack"><div className="stack-h">Market conditions</div><p className="ptxt">{si.market}</p></div>
        <div className="stack"><div className="stack-h">The gap we exploit</div><p className="ptxt">{si.gap}</p></div>
      </Block>

      <Block n="3" title="Objectives & KPIs" ai={hasAI}>
        <div className="kpis">
          <div className="kpi p"><p className="lab">Primary — optimise for</p><div className="val">{k.primary?.metric} {k.primary?.target}</div><p className="sub">{k.primary?.how}</p></div>
          <div className="kpi s"><p className="lab">Secondary</p><div className="val">{k.secondary?.metric} {k.secondary?.target}</div><p className="sub">{k.secondary?.how}</p></div>
          <div className="kpi d"><p className="lab">Diagnostic — watch only</p><div className="val">{k.diagnostic?.metric}</div><p className="sub">{k.diagnostic?.why}</p></div>
        </div>
        {k.notOptimising && <div className="notdoing"><b>What we're not optimising for:</b> {k.notOptimising}</div>}
      </Block>

      <Block n="4" title="Audience strategy" ai={hasAI}>
        {auds.map((a, i) => (
          <div className="stack" key={i}>
            <div className="stack-h">Segment {i + 1} · {a.name}</div>
            <p className="ptxt"><b>Insight:</b> {a.insight}<br /><b>Message:</b> {a.message}<br /><b>Channel:</b> {PLATFORMS[a.channel]?.short || a.channel}</p>
          </div>))}
        <div className="stack"><div className="stack-h">How to build these per platform</div>
          {plan.audiences.map((a) => <p className="ptxt" key={a.p} style={{ marginBottom: 8 }}><b>{a.short}:</b> {a.text}</p>)}</div>
      </Block>

      <Block n="5" title="Positioning & message architecture" ai={hasAI}>
        <div className="stack"><div className="stack-h">Single-minded proposition</div><p className="ptxt">{pos.proposition}</p></div>
        {pos.supporting?.length > 0 && <div className="stack"><div className="stack-h">Supporting messages</div><ul className="tight">{pos.supporting.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
        {pos.rtb?.length > 0 && <div className="stack"><div className="stack-h">Reasons to believe</div><ul className="tight">{pos.rtb.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
      </Block>

      <Block n="6" title={`Channel strategy & budget · AED ${fmt(plan.split.totalBudget)} ${plan.inputs.period === "total" ? "total" : "/mo"}`}>
        {plan.split.rows.map((r, i) => {
          const max = Math.max(...plan.split.rows.map((z) => z.pct));
          return (
            <div className="bar-row" key={r.p}>
              <span className="lbl">{r.short}</span>
              <div className="track"><div className={"fill c" + (i % 6)} data-w={Math.round((r.pct / max) * 100)} style={{ width: 0 }} /></div>
              <span className="amt">{r.pct}% · AED {fmt(r.periodAmt)}</span>
            </div>);
        })}
        {chan.length > 0 && <div className="stack" style={{ marginTop: 16 }}><div className="stack-h">Why each earns its place</div>
          <ul className="tight">{chan.map((c, i) => <li key={i}><b>{PLATFORMS[c.platform]?.short || c.platform}:</b> {c.why}</li>)}</ul></div>}
        {(S.notDoing || fb.notDoing) && <div className="notdoing"><b>What we're not doing, and why:</b> {S.notDoing || fb.notDoing}</div>}
        <p className="disclaimer">Daily pacing per platform ≈ its monthly share ÷ 30.4. Start each with 2–3 ad sets; scale winners.</p>
      </Block>

      <Block n="7" title="Campaign structure per platform">
        {plan.structure.map((s) => (
          <div className="stack" key={s.p}><div className="stack-h">{s.short}</div>
            <ul className="tight">{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></div>))}
      </Block>

      <Block n="8" title="Creative strategy & asset matrix" ai={hasAI}>
        {cre.concept && <p className="ptxt" style={{ marginBottom: 14 }}><b>Concept:</b> {cre.concept}</p>}
        {cre.matrix?.length > 0 && <div className="mwrap"><table className="matrix"><tbody>
          <tr><th>Segment</th><th>Awareness</th><th>Consideration</th><th>Conversion</th></tr>
          {cre.matrix.map((m, i) => <tr key={i}><td className="seg">{m.segment}</td><td>{m.awareness}</td><td>{m.consideration}</td><td>{m.conversion}</td></tr>)}
        </tbody></table></div>}
        <div className="stack" style={{ marginTop: 14 }}><div className="stack-h">Formats per platform</div>
          <div className="fmt">{plan.creatives.map((c) => (
            <div className="col" key={c.p}><h6>{c.short}</h6>{c.formats.map((x, j) => <span className="chip" key={j}>{x}</span>)}</div>))}</div></div>
        {cre.assetCount && <p className="disclaimer">Total: {cre.assetCount}. Vertical-first. Produce every language from the same shoot.</p>}
      </Block>

      <Block n="9" title="Landing experience & conversion path" ai={hasAI}>
        <div className="check">{land.map((l, i) => <div className="ci" key={i}><span className="cb"><Check /></span><span>{l}</span></div>)}</div>
      </Block>

      <Block n="10" title="Measurement & tracking plan">
        <ul className="tight">{plan.tracking.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </Block>

      <Block n="11" title="Testing roadmap" ai={hasAI}>
        {tests.map((t, i) => (
          <div className="risk" key={i}><span className={"sev " + sev(t.priority)}>{t.priority}</span>
            <div className="rb"><b>{t.name}</b>Varies: {t.varies}. <i>Decision rule:</i> {t.rule}</div></div>))}
      </Block>

      <Block n="12" title="Flighting & media calendar">
        {plan.weekly.map((wp) => (
          <div className="stack" key={wp.p}>
            <div className="stack-h">{wp.short}</div>
            {wp.note && <div className="pnote">{wp.note}</div>}
            {wp.weeks.map((w) => (
              <div className="week" key={w.n}>
                <div className="wk-h"><span className="wk-n">W{w.n}</span> {w.phase}</div>
                <div className="wk-b"><b>Do:</b> {w.focus}</div>
                <div className="wk-b"><b>Watch:</b> {w.watch}</div>
                <div className="wk-b"><b>Expect:</b> {w.expect}</div>
                <div className="wk-why">Why: {w.why}</div>
              </div>))}
          </div>))}
      </Block>

      <Block n="13" title="Optimisation cadence & governance" ai={hasAI}>
        <ul className="tight">{opt.map((o, i) => <li key={i}>{o}</li>)}</ul>
      </Block>

      <Block n="14" title="Risk register & contingencies" ai={hasAI}>
        {risks.map((r, i) => (
          <div className="risk" key={i}><span className={"sev " + sev(r.severity)}>{r.severity}</span>
            <div className="rb"><b>{r.risk}</b><i>Mitigation:</i> {r.mitigation} {r.fallback && <><i>Fallback:</i> {r.fallback}</>}</div></div>))}
        <div className="stack" style={{ marginTop: 16 }}><div className="stack-h">UAE compliance flags</div>
          <div className="note-list">{plan.compliance.map((c, i) => <div className="note" key={i}>{c}</div>)}</div></div>
      </Block>

      <Block n="15" title="Budget detail & assumptions">
        <table className="assum"><tbody>
          <tr><th>Assumption</th><th>Source</th><th>Value</th></tr>
          {plan.assumptions.map((a, i) => <tr key={i}><td>{a.a}</td><td>{a.s}</td><td>{a.v}</td></tr>)}
        </tbody></table>
        <div className="notdoing" style={{ marginTop: 14 }}><b>Read this if the forecast misses.</b> Each row is a lever. If results underperform, check which assumption broke — most often it's landing-page conversion rate, not CPM. That tells you to fix the page, not the ads.</div>
      </Block>

      <Block n="16" title="Pre-launch QA & next steps">
        <div className="stack"><div className="stack-h">Go / no-go checklist</div>
          <div className="check">{plan.qa.map((q, i) => <div className="ci" key={i}><span className="cb"><Check /></span><span>{q}</span></div>)}</div></div>
        <div className="stack"><div className="stack-h">Next steps &amp; ownership</div>
          {steps.map((s, i) => (
            <div className="step" key={i}><span className="sn">{i + 1}</span><span>{s.action}</span>
              <span className="owner">{s.owner} · {s.when}</span></div>))}
          <p className="disclaimer">Campaigns die in the gap between approval and execution. Dated actions, named owners.</p></div>
      </Block>
    </div>
  );
}

/* ---------------- Content tab output ---------------- */
export function ContentOut({ c, adLang, setAdLang }) {
  const ads = c.ads || [];
  const langs = [...new Set(ads.map((a) => a.lang))];
  const plats = [...new Set(ads.map((a) => a.platform))];
  const forPlat = (p) => ads.filter((a) => a.platform === p && a.lang === adLang);
  const L = { en: "English", ar: "العربية" };
  let n = 0;

  return (
    <>
      {c.truncated && <div className="err">The model was cut off before finishing. Try a shorter brief.</div>}

      {langs.length > 1 && (
        <div style={{ display: "flex", gap: 6 }}>
          {langs.map((l) => (
            <button key={l} className={"chk" + (adLang === l ? " on" : "")} onClick={() => setAdLang(l)}>{L[l] || l}</button>))}
        </div>)}

      {plats.map((p) => {
        const list = forPlat(p);
        if (!list.length) return null;
        return (
          <Block key={p} n={++n} title={`Ad copy — ${p} · ${L[adLang] || adLang}`} ai>
            <div className="adgrid">
              {list.map((v, i) => (
                <div className="ad" key={i} dir={v.lang === "ar" ? "rtl" : "ltr"}>
                  <CopyBtn text={`${v.headline}\n\n${v.primary}`} rtl={v.lang === "ar"} />
                  <div className="vlab">{v.angle}</div>
                  <h5>{v.headline}</h5><p className="body">{v.primary}</p>
                  <span className="cta">{v.cta}</span>
                </div>))}
            </div>
          </Block>);
      })}

      {c.googleRSA && (
        <Block n={++n} title="Google — Responsive Search Ad" ai>
          <ul className="tight">
            <li><b>Headlines:</b> {(c.googleRSA.headlines || []).join(" · ")}</li>
            <li><b>Descriptions:</b> {(c.googleRSA.descriptions || []).join(" ")}</li>
          </ul>
        </Block>)}

      {(c.hooks?.length > 0 || c.videoScript?.length > 0) && (
        <Block n={++n} title="Creative hooks & video script" ai>
          {c.hooks?.length > 0 && <div className="stack"><div className="stack-h">Scroll-stopping hooks</div>
            <ul className="tight">{c.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul></div>}
          {c.videoScript?.length > 0 && <div className="stack"><div className="stack-h">Short-form script</div>
            {c.videoScript.map((s, i) => (
              <div className="vo" key={i}>
                <div className="vo-h"><span className="ts">{s.ts}</span><b>{s.beat}</b></div>
                <div className="vo-b"><div className="vo-say"><div className="lab">Say this</div><p>{s.say}</p></div>
                  <div className="vo-meta"><div className="vo-m"><small>Visual</small>{s.visual}</div></div></div>
              </div>))}</div>}
        </Block>)}

      {(c.email || c.landingCopy) && (
        <Block n={++n} title="Email + landing page copy" ai>
          {c.email && <div className="stack"><div className="stack-h">Email</div>
            <div className="mail" style={{ marginLeft: 0 }}>
              <p className="prev">Subject</p><p className="subj">{c.email.subject}</p>
              <p className="prev">Preview: {c.email.preview}</p>
              <div className="mbody">{(c.email.body || []).map((p, i) => <p key={i}>{p}</p>)}</div>
            </div></div>}
          {c.landingCopy && <div className="stack"><div className="stack-h">Landing page — above the fold</div>
            <ul className="tight">
              <li><b>Headline:</b> {c.landingCopy.headline}</li>
              <li><b>Subhead:</b> {c.landingCopy.subhead}</li>
              <li><b>Trust bar:</b> {c.landingCopy.trustBar}</li>
              <li><b>CTA:</b> {c.landingCopy.cta}</li>
            </ul></div>}
        </Block>)}

      {c.social?.length > 0 && (
        <Block n={++n} title="Social captions" ai>
          {c.social.map((s, i) => (
            <div className="social" key={i}><div className="plat">{s.platform}</div>{s.caption}
              {s.tags && <div className="tags">{s.tags}</div>}</div>))}
        </Block>)}

      {c.why?.length > 0 && (
        <Block n={++n} title="Why these work" ai>
          <ul className="tight">{c.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </Block>)}

      {c.raw && <Block title="Raw output"><pre className="raw">{c.raw}</pre>{c.note && <p className="disclaimer">{c.note}</p>}</Block>}
    </>
  );
}
