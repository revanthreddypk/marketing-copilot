import React, { useState } from "react";
import { generate, download } from "../lib/api.js";
import { Block, Field, BuildBtn, ErrBox, Loader, Empty, KeyBanner, DownloadIcon } from "../lib/ui.jsx";

export default function YouTube({ go, ai }) {
  const [f, setF] = useState({
    topic:"", length:"Standard (5–8 min)", style:"Tutorial / how-to",
    tone:"Friendly expert", audience:"", language:"English", points:"", cta:""
  });
  const [out,setOut]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const set=(k,v)=>setF(s=>({...s,[k]:v}));

  async function run(){
    if(!f.topic.trim()) return setErr("Add a video topic.");
    if(!ai?.aiEnabled) return setErr("This tool needs an API key. See the Setup Guide.");
    setErr(""); setLoading(true); setOut(null);
    try { setOut(await generate("youtube", f)); } catch(e){ setErr(e.message); }
    setLoading(false);
    setTimeout(()=>document.querySelector(".out")?.scrollIntoView({behavior:"smooth",block:"start"}),90);
  }

  function exportScript(){
    if(!out) return;
    const txt = [
      out.titles?.map((t,i)=>`TITLE ${String.fromCharCode(65+i)}: ${t}`).join("\n"),
      `THUMBNAIL: ${out.thumbnail||""}`,
      `RUNTIME: ${out.runtime||""}  ·  WORDS: ${out.wordCount||""}`,
      "\n" + "=".repeat(60) + "\nSCRIPT\n" + "=".repeat(60),
      ...(out.sections||[]).map(s=>
        `\n[${s.ts}] ${s.beat}\n\nSAY:\n${s.say}\n\nVISUAL: ${s.visual}\nDELIVERY: ${s.delivery}\nON-SCREEN: ${s.onScreen}`),
      "\n" + "=".repeat(60),
      `\nDESCRIPTION:\n${out.description||""}`,
      `\nCHAPTERS:\n${out.chapters||""}`,
      `\nTAGS:\n${out.tags||""}`
    ].filter(Boolean).join("\n");
    download("youtube-script.txt", txt, "text/plain");
  }

  return (
    <div>
      <div className="crumb"><a onClick={()=>go("home")}>← All tools</a> <span>/</span> <span>YouTube Script Generator</span></div>
      {!ai?.aiEnabled && <KeyBanner onDocs={()=>go("docs")} text={<><b>This tool needs an API key.</b> It writes the complete spoken script, word for word. </>} />}

      <div className="card console">
        <div className="hd"><span className="tag">Brief</span><h3>Video inputs</h3></div>
        <div className="form-grid">
          <Field label="Video topic / title" req full><input type="text" value={f.topic} onChange={e=>set("topic",e.target.value)} placeholder="e.g. How to dermaplane at home without irritation" /></Field>
          <Field label="Video length"><select value={f.length} onChange={e=>set("length",e.target.value)}>
            <option>Short (&lt;60s)</option><option>Standard (5–8 min)</option><option>Long (10–15 min)</option></select></Field>
          <Field label="Style"><select value={f.style} onChange={e=>set("style",e.target.value)}>
            <option>Tutorial / how-to</option><option>Listicle</option><option>Story-driven</option><option>Review</option></select></Field>
          <Field label="Tone of delivery"><select value={f.tone} onChange={e=>set("tone",e.target.value)}>
            <option>Friendly expert</option><option>High energy</option><option>Calm &amp; reassuring</option></select></Field>
          <Field label="Language"><select value={f.language} onChange={e=>set("language",e.target.value)}>
            <option>English</option><option>Arabic</option></select></Field>
          <Field label="Target audience"><input type="text" value={f.audience} onChange={e=>set("audience",e.target.value)} placeholder="e.g. beauty beginners, 22–40" /></Field>
          <Field label="Key points to cover" full><textarea value={f.points} onChange={e=>set("points",e.target.value)} placeholder="What must the video include?" /></Field>
          <Field label="Call to action" full><input type="text" value={f.cta} onChange={e=>set("cta",e.target.value)} placeholder="e.g. Link in description" /></Field>
        </div>
        <ErrBox>{err}</ErrBox>
        <BuildBtn loading={loading} onClick={run} label="Generate script" loadingLabel="Writing your script…" />
      </div>

      <div className="out">
        {loading && <Loader text="Writing your script…" />}
        {!loading && !out && <Empty
          icon={<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M22 8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4z"/><path d="M10 9l5 3-5 3z"/></svg>}
          title="Your script will appear here" sub="Add the topic and press Generate script." />}

        {!loading && out && (
          <div className="plan">
            <Block n="1" title="Titles & thumbnail" ai>
              <ul className="tight">
                {(out.titles||[]).map((t,i)=><li key={i}><b>Title {String.fromCharCode(65+i)}:</b> {t}</li>)}
                {out.thumbnail && <li><b>Thumbnail text:</b> {out.thumbnail}</li>}
              </ul>
            </Block>

            <Block n="2" title="Full script — read this on camera" ai
              right={<>
                <span className="wc">≈ {out.wordCount} words · {out.runtime}</span>
                <button className="dlbtn" onClick={exportScript} style={{marginLeft:10}}><DownloadIcon />Export .txt</button>
              </>}>
              {(out.sections||[]).map((s,i)=>(
                <div className="vo" key={i}>
                  <div className="vo-h"><span className="ts">{s.ts}</span><b>{s.beat}</b>{s.words && <span className="dur">{s.words}</span>}</div>
                  <div className="vo-b">
                    <div className="vo-say"><div className="lab">Say this</div><p>{s.say}</p></div>
                    <div className="vo-meta">
                      {s.visual && <div className="vo-m"><small>Visual</small>{s.visual}</div>}
                      {s.delivery && <div className="vo-m"><small>Delivery</small>{s.delivery}</div>}
                      {s.onScreen && <div className="vo-m ov"><small>On-screen text</small>{s.onScreen}</div>}
                    </div>
                  </div>
                </div>))}
            </Block>

            <Block n="3" title="Description, chapters & tags" ai>
              {out.description && <p className="ptxt" style={{marginBottom:12}}>{out.description}</p>}
              {out.chapters && <p className="ptxt"><b>Chapters:</b> {out.chapters}</p>}
              {out.tags && <p className="ptxt" style={{marginTop:10,color:"var(--blue-600)"}}>{out.tags}</p>}
            </Block>

            {out.truncated && <div className="err">The model was cut off before finishing. Try a shorter brief.</div>}
            {out.raw && <Block title="Raw output"><pre className="raw">{out.raw}</pre>{out.note && <p className="disclaimer">{out.note}</p>}</Block>}
          </div>)}
      </div>
    </div>
  );
}
