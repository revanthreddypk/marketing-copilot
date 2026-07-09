import React, { useState } from "react";
import { generate } from "../lib/api.js";
import { Block, Field, Checks, BuildBtn, ErrBox, Loader, Empty, KeyBanner, CopyBtn } from "../lib/ui.jsx";

const PLATFORMS = { Meta: "Meta", Google: "Google", TikTok: "TikTok", Snapchat: "Snapchat", LinkedIn: "LinkedIn", X: "X" };
const LANGS = { en: "English", ar: "العربية" };

export default function AdCopy({ go, ai }) {
  const [url, setUrl] = useState("");
  const [brand, setBrand] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [f, setF] = useState({
    platforms: ["Meta"], langs: ["en", "ar"], objective: "Sales",
    tone: "Match my brand voice", brief: "", offer: ""
  });
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("en");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function scan() {
    if (!url.trim()) return setErr("Add a website URL first.");
    if (!ai?.aiEnabled) return setErr("This tool needs an API key. See the Setup Guide.");
    setErr(""); setScanning(true); setBrand(null);
    try {
      const b = await generate("brandScan", { url: url.trim() });
      setBrand(b);
      if (b.found !== false && b.product && !f.brief) set("brief", b.product);
    } catch (e) { setErr(e.message); }
    setScanning(false);
  }

  async function run() {
    if (!f.brief.trim() && !brand?.product) return setErr("Scan a website or add a product brief.");
    if (!f.platforms.length) return setErr("Pick at least one platform.");
    if (!f.langs.length) return setErr("Pick at least one language.");
    if (!ai?.aiEnabled) return setErr("This tool needs an API key. See the Setup Guide.");
    setErr(""); setLoading(true); setOut(null);
    try {
      const types = ["Ad copy per platform", "Why these work"];
      const d = await generate("content", {
        business: brand?.product || f.brief.slice(0, 60),
        voice: f.tone === "Match my brand voice" ? (brand?.voice || "confident, warm, direct") : f.tone,
        proof: brand?.proof, brief: f.brief, offer: f.offer,
        objective: f.objective, location: "UAE",
        platforms: f.platforms,     // ← now actually sent
        langs: f.langs,             // ← now actually sent
        types
      });
      setOut(d);
      setTab(f.langs.includes("en") ? "en" : "ar");
    } catch (e) { setErr(e.message); }
    setLoading(false);
    setTimeout(() => document.querySelector(".out")?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  }

  const ads = out?.ads || [];
  const platsWithAds = f.platforms.filter((p) => ads.some((a) => (a.platform || "").toLowerCase().includes(p.toLowerCase())));
  const forPlat = (p) => ads.filter((a) => (a.platform || "").toLowerCase().includes(p.toLowerCase()) && a.lang === tab);
  let n = 0;

  return (
    <div>
      <div className="crumb"><a onClick={() => go("home")}>← All tools</a> <span>/</span> <span>Ad Copy Generator</span></div>
      {!ai?.aiEnabled && <KeyBanner onDocs={() => go("docs")} text={<><b>This tool needs an API key.</b> It reads your website, learns the brand voice, then writes in it. </>} />}

      <div className="card console">
        <div className="hd"><span className="tag">Brand</span><h3>Ad copy inputs</h3></div>
        <div className="brandbar">
          <Field label="Website — we'll read it to learn your brand voice">
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbrand.ae" /></Field>
          <button className="scan" onClick={scan} disabled={scanning || !ai?.aiEnabled}>
            {scanning ? <span className="spin" /> : <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>}
            {scanning ? "Reading…" : "Scan website"}</button>
        </div>

        {brand && (brand.found === false
          ? <div className="brandcard miss"><b>Couldn't read that page</b>{brand.note}</div>
          : <div className="brandcard"><b>✓ Brand learned from {url}</b>
              <div className="bc-grid">
                {brand.voice && <div className="bc"><small>Voice</small>{brand.voice}</div>}
                {brand.product && <div className="bc"><small>Product</small>{brand.product}</div>}
                {brand.proof && <div className="bc"><small>Proof found</small>{brand.proof}</div>}
                {brand.audience && <div className="bc"><small>Audience signal</small>{brand.audience}</div>}
              </div></div>)}

        <div className="form-grid">
          <div className="f spanfull"><span className="lblspan">Platforms <b className="req">*</b></span>
            <Checks options={PLATFORMS} value={f.platforms} onChange={(v) => set("platforms", v)} />
            <p className="hint">Copy is written natively for each platform you pick — nothing else.</p></div>
          <div className="f spanfull"><span className="lblspan">Languages <b className="req">*</b></span>
            <Checks options={LANGS} value={f.langs} onChange={(v) => set("langs", v)} />
            <p className="hint">Arabic is written natively, not translated.</p></div>
          <Field label="Objective"><select value={f.objective} onChange={(e) => set("objective", e.target.value)}>
            <option>Sales</option><option>Leads</option><option>Traffic</option><option>Awareness</option></select></Field>
          <Field label="Tone"><select value={f.tone} onChange={(e) => set("tone", e.target.value)}>
            <option>Match my brand voice</option><option>Bold &amp; punchy</option><option>Warm &amp; friendly</option><option>Premium</option></select></Field>
          <Field label="Product brief" full><textarea value={f.brief} onChange={(e) => set("brief", e.target.value)} placeholder="What you're selling and why people buy it." /></Field>
          <Field label="Offer (optional)" full><input type="text" value={f.offer} onChange={(e) => set("offer", e.target.value)} /></Field>
        </div>
        <ErrBox>{err}</ErrBox>
        <BuildBtn loading={loading} onClick={run} label="Generate ad copy" loadingLabel="Writing in your brand voice…" />
        <p className="buildnote">{f.platforms.join(" · ")} — {f.langs.map((l) => LANGS[l]).join(" + ")}</p>
      </div>

      <div className="out">
        {loading && <Loader text="Writing in your brand voice…" />}
        {!loading && !out && <Empty
          icon={<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>}
          title="Your ad copy will appear here" sub="Scan a website or add a brief, then press Generate ad copy." />}

        {!loading && out && (
          <div className="plan">
            {out.truncated && <div className="err">The model was cut off before finishing. Try a shorter brief.</div>}

            {f.langs.length > 1 && ads.length > 0 && (
              <div style={{ display: "flex", gap: 6 }}>
                {f.langs.map((l) => (
                  <button key={l} className={"chk" + (tab === l ? " on" : "")} onClick={() => setTab(l)}>{LANGS[l]}</button>))}
              </div>)}

            {platsWithAds.map((p) => {
              const list = forPlat(p);
              if (!list.length) return null;
              return (
                <Block key={p} n={++n} title={`${p} — ${LANGS[tab]}`} ai>
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

            {ads.length > 0 && !platsWithAds.length &&
              <Block n={++n} title="No ads returned"><p className="ptxt">The model didn't return copy for your selected platforms. Try regenerating.</p></Block>}

            {out.googleRSA && f.platforms.includes("Google") && (
              <Block n={++n} title="Google — Responsive Search Ad" ai>
                <ul className="tight">
                  <li><b>Headlines:</b> {(out.googleRSA.headlines || []).join(" · ")}</li>
                  <li><b>Descriptions:</b> {(out.googleRSA.descriptions || []).join(" ")}</li>
                </ul>
              </Block>)}

            {out.why?.length > 0 && (
              <Block n={++n} title="Why these work" ai>
                <ul className="tight">{out.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </Block>)}

            {out.raw && <Block title="Raw output"><pre className="raw">{out.raw}</pre>{out.note && <p className="disclaimer">{out.note}</p>}</Block>}
          </div>)}
      </div>
    </div>
  );
}
