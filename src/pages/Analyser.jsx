import React, { useState } from "react";
import { generate, download, toCSV } from "../lib/api.js";
import { Block, Field, BuildBtn, ErrBox, Loader, Empty, KeyBanner, DownloadIcon, Check, Spark, CopyBtn } from "../lib/ui.jsx";

const SEV = (s = "") => (/crit/i.test(s) ? "crit" : /high/i.test(s) ? "high" : /med/i.test(s) ? "med" : "low");
const HEAT = { high: "rgba(234,67,53,.55)", med: "rgba(251,188,5,.45)", low: "rgba(52,168,83,.28)" };

export default function Analyser({ go, ai }) {
  const [f, setF] = useState({
    url: "", keyword: "", pageType: "Product page",
    market: "United Arab Emirates", goal: "Purchase / Add to cart"
  });
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dev, setDev] = useState("m");          // 'm' | 'd'
  const [tab, setTab] = useState("overview");
  const [sevFilter, setSevFilter] = useState("all");
  const [layers, setLayers] = useState({ heat: true, gaze: true, fold: true });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function run() {
    if (!f.url.trim()) return setErr("Add a page URL.");
    if (!ai?.aiEnabled) return setErr("This tool needs an API key. See the Setup Guide.");
    setErr(""); setLoading(true); setOut(null);
    try {
      const d = await generate("analyse", f);
      if (d.fetchFailed) setErr(d.message); else setOut(d);
    } catch (e) { setErr(e.message); }
    setLoading(false);
    setTimeout(() => document.querySelector(".out")?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  }

  const A = out?.attention?.[dev === "m" ? "mobile" : "desktop"] || {};
  const other = out?.attention?.[dev === "m" ? "desktop" : "mobile"] || {};
  const isM = dev === "m";
  const score = out?.scores?.[isM ? "mobile" : "desktop"] ?? 0;
  const scoreColor = (v) => (v >= 80 ? "var(--green)" : v >= 50 ? "var(--orange)" : "var(--red)");

  const issues = out?.issues || [];
  const shown = sevFilter === "all" ? issues
    : sevFilter === "aeo" ? issues.filter((i) => /aeo/i.test(i.category))
    : sevFilter === "dev" ? issues.filter((i) => /mobile|desktop/i.test(i.category))
    : issues.filter((i) => SEV(i.severity) === sevFilter);
  const count = (s) => issues.filter((i) => SEV(i.severity) === s).length;

  function exportIssues() {
    download("page-issues.csv", toCSV(issues.map((i) => ({
      id: i.id, issue: i.issue, category: i.category, location: i.location,
      severity: i.severity, why: i.why, fix: (i.fixSteps || []).join(" | "),
      effort: i.effort, owner: i.owner
    }))), "text/csv");
  }
  function exportGuide() {
    const L = [`PAGE ANALYSIS — ${f.url}`, "=".repeat(60), "", out.verdict?.headline || "", out.verdict?.summary || "", "",
      `BIGGEST BLOCKER: ${out.verdict?.blocker?.title}`, out.verdict?.blocker?.detail || "", "",
      "=".repeat(60), "ISSUES", "=".repeat(60)];
    issues.forEach((i) => {
      L.push("", `[${i.severity}] #${i.id} ${i.issue}`, `Category: ${i.category} · Location: ${i.location}`,
        `Why: ${i.why}`, "Fix:", ...(i.fixSteps || []).map((s, n) => `  ${n + 1}. ${s}`));
      if (i.code) L.push("", i.code);
      L.push(`Effort: ${i.effort} · Owner: ${i.owner}`);
    });
    if (out.aeo) {
      L.push("", "=".repeat(60), `AEO PLAYBOOK — score ${out.aeo.score}/100`, "=".repeat(60), out.aeo.intro || "");
      (out.aeo.steps || []).forEach((s) => {
        L.push("", `${s.n}. ${s.title}`, s.why || "");
        if (s.template) L.push("", "TEMPLATE:", s.template);
        if (s.code) L.push("", "CODE:", s.code);
        (s.checks || []).forEach((c) => L.push(`  ✓ ${c}`));
      });
      L.push("", "HOW TO MEASURE:", out.aeo.howToMeasure || "");
    }
    download("page-fix-guide.txt", L.join("\n"), "text/plain");
  }

  return (
    <div>
      <div className="crumb"><a onClick={() => go("home")}>← All tools</a> <span>/</span> <span>Website Page Analyser</span></div>
      {!ai?.aiEnabled && <KeyBanner onDocs={() => go("docs")} text={<><b>This tool needs an API key.</b> It fetches your page, pulls free Core Web Vitals from Google, and audits indexability, on-page, schema, E-E-A-T, AEO and attention. </>} />}

      <div className="card console">
        <div className="hd"><span className="tag">Analyse</span><h3>Page inputs</h3></div>
        <div className="form-grid">
          <Field label="Page URL" req full><input type="text" value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://yoursite.ae/products/example" /></Field>
          <Field label="Target keyword"><input type="text" value={f.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="e.g. hair identifier spray uae" /></Field>
          <Field label="Page type"><select value={f.pageType} onChange={(e) => set("pageType", e.target.value)}>
            <option>Product page</option><option>Homepage</option><option>Category / collection</option>
            <option>Blog / article</option><option>Landing page</option><option>Local business</option></select></Field>
          <Field label="Market / geo"><select value={f.market} onChange={(e) => set("market", e.target.value)}>
            <option>United Arab Emirates</option><option>Saudi Arabia</option><option>Global</option></select></Field>
          <Field label="Primary conversion goal"><select value={f.goal} onChange={(e) => set("goal", e.target.value)}>
            <option>Purchase / Add to cart</option><option>Lead form</option><option>WhatsApp / call</option><option>Newsletter signup</option></select></Field>
        </div>
        <ErrBox>{err}</ErrBox>
        <BuildBtn loading={loading} onClick={run} label="Analyse page" loadingLabel="Fetching and auditing…" />
        <p className="buildnote">Fetches the live page · free Core Web Vitals from Google PageSpeed Insights · both viewports</p>
      </div>

      <div className="out">
        {loading && <Loader text="Fetching the page, pulling Core Web Vitals, running the audit…" />}
        {!loading && !out && <Empty
          icon={<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>}
          title="Your analysis will appear here" sub="Add a URL and press Analyse page." />}

        {!loading && out && <>
          {/* DEVICE SWITCH */}
          <div className="devbar">
            <div className="devswitch">
              <button className={isM ? "on" : ""} onClick={() => setDev("m")}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></svg>Mobile</button>
              <button className={!isM ? "on" : ""} onClick={() => setDev("d")}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>Desktop</button>
            </div>
            <div className="devmeta">
              <span>Viewport <b>{A.viewport}</b></span>
              <span>Fold at <b>{A.fold}px</b></span>
            </div>
          </div>
          {out.deviceInsight && <div className="devalert">{isM ? "📱" : "🖥"} {out.deviceInsight}</div>}

          <div className="tabbar">
            {[["overview", "Overview"], ["attention", "Attention Map"], ["issues", `Issues`], ["aeo", "AEO Playbook"], ["roadmap", "Fixes & Roadmap"], ["evidence", "Evidence"]].map(([k, l]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                {l}{k === "issues" && <span className="cnt">{issues.length}</span>}
                {k === "aeo" && out.aeo?.steps && <span className="cnt">{out.aeo.steps.length}</span>}
              </button>))}
          </div>

          {/* ---------- OVERVIEW ---------- */}
          {tab === "overview" && <div className="plan">
            <Block>
              <div className="scorewrap">
                <div className="ringbox">
                  <Ring score={score} />
                  <div className="rlbl">{isM ? "📱 Mobile" : "🖥 Desktop"} — this device</div>
                  <div className="otherscore">{isM ? "Desktop" : "Mobile"} scores <b>{out.scores?.[isM ? "desktop" : "mobile"]}</b></div>
                </div>
                <div className="verdict">
                  <h3>{out.verdict?.headline}</h3>
                  <p>{out.verdict?.summary}</p>
                  {out.verdict?.blocker && <div className="blocker">
                    <b>Biggest blocker — affects {out.verdict.blocker.affects}</b>{out.verdict.blocker.detail}</div>}
                </div>
              </div>

              <div className="catgrid">
                {(out.scores?.categories || []).map((c) => {
                  const v = isM ? c.m : c.d;
                  const diff = c.d - c.m;
                  const showDelta = !c.deviceAgnostic && diff !== 0 && isM;
                  return (
                    <div className="cat" key={c.name}>
                      <div className="ch"><span className="cn">{c.name}</span>
                        <span className="cs" style={{ color: scoreColor(v) }}>{v}</span></div>
                      <div className="cbar"><div className="cf" style={{ width: v + "%", background: scoreColor(v) }} /></div>
                      {showDelta && <div className={"delta " + (diff > 0 ? "up" : "down")}>{diff > 0 ? "+" : ""}{diff} on desktop</div>}
                      {c.deviceAgnostic && <div className="delta agnostic">same on both</div>}
                    </div>);
                })}
              </div>
              <p className="disclaimer">Indexability, on-page, schema, E-E-A-T and AEO are device-agnostic — they score identically. Performance, attention and conversion are measured separately per viewport. Score is weighted so a page that can't be indexed cannot exceed 50.</p>
            </Block>

            <Block n="1" title="Mobile vs Desktop, side by side">
              <div className="cmp">
                {["mobile", "desktop"].map((k) => {
                  const a = out.attention?.[k] || {};
                  const sc = out.scores?.[k];
                  const psi = out.evidence?.[k === "mobile" ? "psiMobile" : "psiDesktop"];
                  const act = (k === "mobile") === isM;
                  return (
                    <div className={"cmpc" + (act ? " active" : "")} key={k}>
                      <h6>{k === "mobile" ? "📱 Mobile" : "🖥 Desktop"} — {a.viewport}{act && <span className="nowview">viewing</span>}</h6>
                      <div className="row"><span>Health score</span><b style={{ color: scoreColor(sc) }}>{sc}</b></div>
                      {psi && <>
                        <div className="row"><span>LCP</span><b>{psi.lcp || "—"}</b></div>
                        <div className="row"><span>INP</span><b>{psi.inp || "—"}</b></div>
                        <div className="row"><span>CLS</span><b>{psi.cls || "—"}</b></div>
                      </>}
                      <div className="row"><span>Fold</span><b>{a.fold}px</b></div>
                      <div className="row"><span>Above-fold attention</span><b>{a.aboveFold}</b></div>
                      <div className="row"><span>Trust signals seen</span><b>{a.trustShare}</b></div>
                      <div className="row"><span>Time to CTA</span><b>{a.timeToCta}</b></div>
                    </div>);
                })}
              </div>
            </Block>

            <Block n="2" title="What we found, in one read" ai>
              {out.working?.length > 0 && <div className="stack"><div className="stack-h">What's working</div>
                <ul className="tight">{out.working.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
              {out.broken?.length > 0 && <div className="stack"><div className="stack-h">What's broken</div>
                <ul className="tight">{out.broken.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
              {out.quickest && <div className="stack"><div className="stack-h">The 20% that gets 80% of the result</div>
                <p className="ptxt">{out.quickest}</p></div>}
            </Block>
          </div>}

          {/* ---------- ATTENTION ---------- */}
          {tab === "attention" && <div className="plan">
            <Block n="3" title={`Predicted attention map — ${isM ? "Mobile" : "Desktop"}`} ai>
              <div className="overlay-toggle">
                {[["heat", "Heat overlay"], ["gaze", "Gaze order"], ["fold", "Fold line"]].map(([k, l]) => (
                  <button key={k} className={"chk" + (layers[k] ? " on" : "")} onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}>
                    <span className="box">{layers[k] && <Check />}</span>{l}</button>))}
              </div>

              <div className="heatwrap">
                <div className="viewport">
                  <div className="vp-bar"><span className="d" /><span className="d" /><span className="d" />
                    <span className="u">{f.url}</span><span className="dv">{A.viewport}</span></div>
                  <Wireframe A={A} isM={isM} layers={layers} />
                </div>

                <div>
                  <div className="attnstat">
                    <div className="as"><small>Above fold</small><b>{A.aboveFold}</b></div>
                    <div className="as"><small>CTA attention</small><b>{A.ctaShare}</b></div>
                    <div className="as"><small>Trust signals</small><b>{A.trustShare}</b></div>
                    <div className="as"><small>Time to CTA</small><b>{A.timeToCta}</b></div>
                  </div>
                  <div className="legend"><h6>Attention intensity</h6>
                    <div className="lg-scale" /><div className="lg-lbl"><span>Ignored</span><span>Glanced</span><span>Fixated</span></div></div>
                  <div className="legend"><h6>Predicted gaze order — {isM ? "mobile · F-pattern" : "desktop · Z-pattern"}</h6>
                    {(A.gaze || []).map((g) => (
                      <div className="gz" key={g.n}><span className="num">{g.n}</span>
                        <div><b>{g.label}</b><span>{g.note}</span></div></div>))}
                  </div>
                </div>
              </div>

              {A.findings?.length > 0 && <div className="stack" style={{ marginTop: 20 }}>
                <div className="stack-h">What the {isM ? "mobile" : "desktop"} map tells us</div>
                <ul className="tight">{A.findings.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}

              <div className="na"><b>How this is calculated.</b> This is a <b>predictive</b> attention model, not observed user data. Elements are laid out from the page's actual DOM structure, then scored on visual saliency — size, contrast, position, isolation — with F-pattern (mobile) and Z-pattern (desktop) reading behaviour layered on. It agrees with real eye-tracking roughly 80–90% of the time on first-glance predictions. For observed behaviour, install Microsoft Clarity (free) and compare after two weeks.</div>
            </Block>
          </div>}

          {/* ---------- ISSUES ---------- */}
          {tab === "issues" && <div className="plan">
            <Block n="4" title="Issue table" right={<button className="dlbtn" onClick={exportIssues}><DownloadIcon />Export CSV</button>}>
              <div className="filters">
                <button className={"filt" + (sevFilter === "all" ? " on" : "")} onClick={() => setSevFilter("all")}>All <b>{issues.length}</b></button>
                {["crit", "high", "med", "low"].map((s) => (
                  <button key={s} className={"filt" + (sevFilter === s ? " on" : "")} onClick={() => setSevFilter(s)}>
                    <span className={"pip " + s} />{{ crit: "Critical", high: "High", med: "Medium", low: "Low" }[s]} <b>{count(s)}</b></button>))}
                <button className={"filt" + (sevFilter === "aeo" ? " on" : "")} onClick={() => setSevFilter("aeo")}>
                  <span className="pip aeo" />AEO only <b>{issues.filter((i) => /aeo/i.test(i.category)).length}</b></button>
                <button className={"filt" + (sevFilter === "dev" ? " on" : "")} onClick={() => setSevFilter("dev")}>
                  <span className="pip dev" />Device-specific <b>{issues.filter((i) => /mobile|desktop/i.test(i.category)).length}</b></button>
              </div>

              <div className="mwrap">
                <table className="itable">
                  <thead><tr><th>#</th><th>Issue</th><th>Category</th><th>Location</th><th>Severity</th><th>Why it matters</th><th>Fix</th><th>Effort</th><th>Owner</th></tr></thead>
                  <tbody>
                    {shown.map((i) => (
                      <tr key={i.id}>
                        <td className="id">{i.id}</td>
                        <td className="iss">{i.issue}</td>
                        <td><span className={"cattag" + (/aeo/i.test(i.category) ? " aeo" : /mobile|desktop/i.test(i.category) ? " dv" : "")}>{i.category}</span></td>
                        <td className="loc">{i.location}</td>
                        <td><span className={"sev " + SEV(i.severity)}>{i.severity}</span></td>
                        <td>{i.why}</td>
                        <td className="fixcell">
                          <details><summary>Show fix</summary>
                            <div className="fixbody">
                              <ol>{(i.fixSteps || []).map((s, n) => <li key={n}>{s}</li>)}</ol>
                              {i.code && <pre>{i.code}</pre>}
                            </div></details></td>
                        <td className="eff">{i.effort}</td>
                        <td><span className="own">{i.owner}</span></td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
              <p className="disclaimer"><b>Critical</b>: blocks indexing/rankings · <b>High</b>: measurable traffic loss · <b>Medium</b>: missed opportunity · <b>Low</b>: polish. Every issue traces to a measured fact — see Evidence.</p>
            </Block>
          </div>}

          {/* ---------- AEO ---------- */}
          {tab === "aeo" && out.aeo && <div className="plan">
            <Block n="5" title="AEO Playbook — get cited by AI" ai right={<button className="dlbtn p" onClick={exportGuide}><DownloadIcon />Download playbook</button>}>
              <div className="aeo-hero">
                <h5>Your AEO score is {out.aeo.score} / 100.</h5>
                <p>{out.aeo.intro}</p>
              </div>
              {(out.aeo.steps || []).map((s) => (
                <div className="aeostep" key={s.n}>
                  <span className="an">{s.n}</span>
                  <div className="ab">
                    <b>{s.title}</b>
                    <p>{s.why}</p>
                    {s.template && <div className="copybox">
                      <CopyBtn text={s.template} />
                      <div className="cl">Ready to paste — edit for your product</div>{s.template}</div>}
                    {s.code && <div className="codebox"><pre>{s.code}</pre></div>}
                    {(s.checks || []).map((c, i) => (
                      <div className="checkrow" key={i}><span className="cb"><Check /></span><span>{c}</span></div>))}
                  </div>
                </div>))}
              {out.aeo.howToMeasure && <div className="na" style={{ marginTop: 18 }}><b>How to check whether it worked.</b> {out.aeo.howToMeasure}</div>}
            </Block>
          </div>}

          {/* ---------- ROADMAP ---------- */}
          {tab === "roadmap" && <div className="plan">
            <Block n="6" title="Prioritised roadmap" ai>
              <div className="lanes">
                {[["quickWins", "q", "Quick wins", "High impact, low effort — ship this week."],
                  ["strategic", "s", "Strategic", "High impact, needs a sprint."],
                  ["backlog", "b", "Backlog", "Do when convenient."]].map(([k, cls, title, sub]) => (
                  <div className={"lane " + cls} key={k}>
                    <h5><span className="lb" />{title}</h5><p className="sub">{sub}</p>
                    {(out.roadmap?.[k] || []).map((t, i) => (
                      <div className="task" key={i}>
                        <div className="th"><b>{t.task}</b>{t.severity && <span className={"sev " + SEV(t.severity)}>{t.severity}</span>}</div>
                        {t.note}
                        <div className="meta">{t.effort && <span>{t.effort}</span>}{t.owner && <span>{t.owner}</span>}</div>
                      </div>))}
                  </div>))}
              </div>
              <div className="dlrow">
                <button className="dlbtn b" onClick={exportGuide}><DownloadIcon />Download fix guide</button>
                <button className="dlbtn" onClick={exportIssues}><DownloadIcon />Export tickets (CSV)</button>
              </div>
            </Block>

            {out.tracking?.length > 0 && <Block n="7" title="Before / after tracking plan">
              <p className="ptxt" style={{ marginBottom: 14 }}>Baseline these today. Re-measure at 4 and 8 weeks.</p>
              <table className="tracktable"><tbody>
                <tr><th>Metric</th><th>Baseline</th><th>Where to read it</th><th>Expected by week 8</th></tr>
                {out.tracking.map((t, i) => (
                  <tr key={i}><td>{t.metric}</td><td>{t.baseline}</td><td>{t.where}</td><td>{t.expected}</td></tr>))}
              </tbody></table>
              <p className="disclaimer">Deliberately no predicted percentages. Anyone promising "+30% traffic in 8 weeks" from a page audit is guessing. Set the baseline, ship the fixes, read the data. Segment GA4 by device.</p>
            </Block>}
          </div>}

          {/* ---------- EVIDENCE ---------- */}
          {tab === "evidence" && out.evidence && <div className="plan">
            <Block n="8" title="Evidence appendix">
              <p className="ptxt" style={{ marginBottom: 16 }}>Measured directly from the page. Nothing here is AI-generated.</p>
              <div className="evid">
                <Ev title="Crawl & indexability" rows={[
                  ["HTTP status", out.evidence.facts.httpStatus, out.evidence.facts.httpStatus === 200 ? "good" : "bad"],
                  ["Meta robots", out.evidence.facts.robots || "not set", /noindex/i.test(out.evidence.facts.robots || "") ? "bad" : "good"],
                  ["Canonical", out.evidence.facts.canonical || "absent", out.evidence.facts.canonicalSelfReferencing ? "good" : "bad"],
                  ["Self-referencing", String(out.evidence.facts.canonicalSelfReferencing), out.evidence.facts.canonicalSelfReferencing ? "good" : "bad"],
                  ["Hreflang tags", out.evidence.facts.hreflangTags.length, out.evidence.facts.hreflangTags.length ? "good" : "warn"]
                ]} src="Live fetch of the page + robots.txt" />

                {out.evidence.psiMobile && <Ev title="Core Web Vitals — mobile" rows={[
                  ["PSI score", out.evidence.psiMobile.score, out.evidence.psiMobile.score >= 90 ? "good" : out.evidence.psiMobile.score >= 50 ? "warn" : "bad"],
                  ["LCP", out.evidence.psiMobile.lcp || "—", ""], ["INP", out.evidence.psiMobile.inp || "—", ""],
                  ["CLS", out.evidence.psiMobile.cls || "—", ""],
                  ["Field data", out.evidence.psiMobile.fieldData ? "Yes (CrUX)" : "Lab only", out.evidence.psiMobile.fieldData ? "good" : "warn"]
                ]} src="Google PageSpeed Insights API" />}

                {out.evidence.psiDesktop && <Ev title="Core Web Vitals — desktop" rows={[
                  ["PSI score", out.evidence.psiDesktop.score, out.evidence.psiDesktop.score >= 90 ? "good" : "warn"],
                  ["LCP", out.evidence.psiDesktop.lcp || "—", ""], ["INP", out.evidence.psiDesktop.inp || "—", ""],
                  ["CLS", out.evidence.psiDesktop.cls || "—", ""]
                ]} src="Google PageSpeed Insights API" />}

                <Ev title="On-page" rows={[
                  ["Title length", out.evidence.facts.titleLen + " chars", out.evidence.facts.titleLen > 60 || out.evidence.facts.titleLen < 30 ? "warn" : "good"],
                  ["Meta description", out.evidence.facts.metaDesc ? out.evidence.facts.metaDescLen + " chars" : "Missing", out.evidence.facts.metaDesc ? "good" : "bad"],
                  ["H1 count", out.evidence.facts.h1Count, out.evidence.facts.h1Count === 1 ? "good" : "bad"],
                  ["Word count", out.evidence.facts.wordCount, out.evidence.facts.wordCount > 300 ? "good" : "warn"],
                  ["Images with alt", `${out.evidence.facts.imagesWithAlt} / ${out.evidence.facts.images}`, out.evidence.facts.imagesWithAlt === out.evidence.facts.images ? "good" : "bad"],
                  ["Internal links", out.evidence.facts.internalLinks, out.evidence.facts.internalLinks > 3 ? "good" : "warn"]
                ]} src="Rendered DOM parse" />

                <Ev title="Structured data" rows={[
                  ["Types found", out.evidence.facts.schemaTypes.join(", ") || "none", out.evidence.facts.schemaTypes.length ? "good" : "bad"],
                  ["Product", String(out.evidence.facts.hasProductSchema), out.evidence.facts.hasProductSchema ? "good" : "bad"],
                  ["FAQPage", String(out.evidence.facts.hasFaqSchema), out.evidence.facts.hasFaqSchema ? "good" : "bad"],
                  ["Organization", String(out.evidence.facts.hasOrgSchema), out.evidence.facts.hasOrgSchema ? "good" : "warn"],
                  ["sameAs present", String(out.evidence.facts.hasSameAs), out.evidence.facts.hasSameAs ? "good" : "warn"],
                  ["Breadcrumb", String(out.evidence.facts.hasBreadcrumb), out.evidence.facts.hasBreadcrumb ? "good" : "warn"]
                ]} src="JSON-LD extraction" />

                <Ev title="AEO / AI visibility" rows={[
                  ["FAQ schema", out.evidence.facts.hasFaqSchema ? "Present" : "Absent", out.evidence.facts.hasFaqSchema ? "good" : "bad"],
                  ["Entity (sameAs)", out.evidence.facts.hasSameAs ? "Present" : "Absent", out.evidence.facts.hasSameAs ? "good" : "bad"],
                  ["Outbound citations", out.evidence.facts.externalLinks, out.evidence.facts.externalLinks > 0 ? "good" : "bad"],
                  ["Comparison table", out.evidence.facts.hasComparisonTable ? "Present" : "Absent", out.evidence.facts.hasComparisonTable ? "good" : "warn"],
                  ...Object.entries(out.evidence.robots.aiCrawlers || {}).map(([b, v]) => [b, v, v === "declared" ? "good" : "warn"])
                ]} src="DOM + robots.txt parse" />
              </div>
              <div className="na"><b>Backlinks &amp; keyword data — not available.</b> Requires an Ahrefs or Semrush API key. Rather than estimate referring domains, we've left it out.</div>
              <p className="disclaimer" style={{ marginTop: 16 }}><b>Method note.</b> We parse the page as served. Sites that inject schema or content purely client-side may report differently than a full headless render would — that limitation is stated rather than hidden.</p>
            </Block>
          </div>}
        </>}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function Ring({ score }) {
  const c = 2 * Math.PI * 56;
  const col = score >= 80 ? "#34A853" : score >= 50 ? "#FBBC05" : "#EA4335";
  return (
    <div className="ring">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r="56" fill="none" stroke="#E8EAED" strokeWidth="12" />
        <circle cx="66" cy="66" r="56" fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="val"><b style={{ color: col }}>{score}</b></div>
    </div>
  );
}

function Wireframe({ A, isM, layers }) {
  const W = isM ? 390 : 1440, H = isM ? 760 : 800;
  const els = A.elements || [];
  const foldPct = isM ? (A.fold / 844) * 100 : (A.fold / 900) * 100;
  return (
    <div className="stage">
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#fff" />
        {els.map((e, i) => {
          const x = (e.x / 100) * W - ((e.w / 100) * W) / 2;
          const y = (e.y / 100) * H - ((e.h / 100) * H) / 2;
          const w = (e.w / 100) * W, h = (e.h / 100) * H;
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="7" fill="#EEF0F2" stroke="#DADCE0" />
              <text x={x + w / 2} y={y + h / 2 + 4} fontFamily="Roboto" fontSize={isM ? 10 : 13} fill="#80868B" textAnchor="middle">{e.label}</text>
              {layers.heat && <ellipse cx={x + w / 2} cy={y + h / 2} rx={w * 0.72} ry={h * 0.85} fill={HEAT[e.heat] || HEAT.low} />}
            </g>);
        })}
      </svg>
      {layers.fold && <div className="foldline" style={{ top: foldPct + "%" }}><span className="foldlbl">Fold — {A.fold}px</span></div>}
      {layers.gaze && (A.gaze || []).map((g, i) => {
        const e = els.find((x) => x.label === g.label) || els[i] || { x: 50, y: 20 };
        return <div className="gaze" key={g.n} style={{ left: e.x + "%", top: e.y + "%" }}>{g.n}</div>;
      })}
    </div>
  );
}

function Ev({ title, rows, src }) {
  return (
    <div className="ev"><h6>{title}</h6>
      <div className="kv">{rows.map(([k, v, cls], i) => (
        <React.Fragment key={i}><span className="k">{k}</span><span className={"v " + (cls || "")}>{String(v)}</span></React.Fragment>))}</div>
      <div className="srcnote">Source: {src}</div>
    </div>);
}
