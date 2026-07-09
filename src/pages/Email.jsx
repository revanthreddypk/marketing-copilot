import React, { useState } from "react";
import { generate, download, toCSV } from "../lib/api.js";
import { Block, Field, BuildBtn, ErrBox, Loader, Empty, KeyBanner, DownloadIcon } from "../lib/ui.jsx";

export default function Email({ go, ai }) {
  const [f,setF]=useState({
    business:"", seqType:"Abandoned cart", count:"4", trigger:"Cart abandoned",
    language:"English", tone:"Warm & helpful", exportFor:"Klaviyo", offer:"", objection:""
  });
  const [out,setOut]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const set=(k,v)=>setF(s=>({...s,[k]:v}));

  async function run(){
    if(!f.business.trim()) return setErr("Add your business and product.");
    if(!ai?.aiEnabled) return setErr("This tool needs an API key. See the Setup Guide.");
    setErr(""); setLoading(true); setOut(null);
    try { setOut(await generate("email", { ...f, count: parseInt(f.count) })); }
    catch(e){ setErr(e.message); }
    setLoading(false);
    setTimeout(()=>document.querySelector(".out")?.scrollIntoView({behavior:"smooth",block:"start"}),90);
  }

  function exportCSV(){
    if(!out?.emails) return;
    const rows = out.emails.map(e=>({
      email_number:e.n, delay_from_trigger:e.delay, goal:e.goal, subject:e.subject,
      preview_text:e.preview, body:(e.body||[]).join("\n\n"), cta:e.cta, exit_rule:e.exit
    }));
    download("email-sequence.csv", toCSV(rows), "text/csv");
  }
  function exportJSON(){
    if(!out) return;
    download("email-sequence.json", JSON.stringify(out,null,2));
  }

  return (
    <div>
      <div className="crumb"><a onClick={()=>go("home")}>← All tools</a> <span>/</span> <span>Email Sequence Builder</span></div>
      {!ai?.aiEnabled && <KeyBanner onDocs={()=>go("docs")} text={<><b>This tool needs an API key.</b> It writes the full sequence — triggers, delays, subject lines, body copy and exit rules. </>} />}

      <div className="card console">
        <div className="hd"><span className="tag">Brief</span><h3>Sequence inputs</h3></div>
        <div className="form-grid">
          <Field label="Business & product" req full><input type="text" value={f.business} onChange={e=>set("business",e.target.value)} placeholder="e.g. Cozitis.ae — hair identifier spray" /></Field>
          <Field label="Sequence type" req><select value={f.seqType} onChange={e=>set("seqType",e.target.value)}>
            <option>Abandoned cart</option><option>Welcome / onboarding</option><option>Lead nurture</option>
            <option>Win-back / re-engagement</option><option>Post-purchase</option><option>Product launch</option></select></Field>
          <Field label="Number of emails"><select value={f.count} onChange={e=>set("count",e.target.value)}>
            <option>3</option><option>4</option><option>5</option><option>7</option></select></Field>
          <Field label="Trigger"><select value={f.trigger} onChange={e=>set("trigger",e.target.value)}>
            <option>Cart abandoned</option><option>Signup</option><option>Purchase</option><option>Tag added</option></select></Field>
          <Field label="Language"><select value={f.language} onChange={e=>set("language",e.target.value)}>
            <option>English</option><option>Arabic</option><option>English + Arabic</option></select></Field>
          <Field label="Tone"><select value={f.tone} onChange={e=>set("tone",e.target.value)}>
            <option>Warm &amp; helpful</option><option>Direct &amp; urgent</option><option>Premium</option></select></Field>
          <Field label="Export for"><select value={f.exportFor} onChange={e=>set("exportFor",e.target.value)}>
            <option>Klaviyo</option><option>Mailchimp</option><option>n8n / automation</option><option>Generic CSV</option></select></Field>
          <Field label="Offer / incentive" full><input type="text" value={f.offer} onChange={e=>set("offer",e.target.value)} placeholder="e.g. BOGO + free delivery, expires in 48 hours" /></Field>
          <Field label="Main objection to overcome" full><input type="text" value={f.objection} onChange={e=>set("objection",e.target.value)} placeholder="e.g. never heard of this product category" /></Field>
        </div>
        <ErrBox>{err}</ErrBox>
        <BuildBtn loading={loading} onClick={run} label="Build sequence" loadingLabel="Writing your sequence…" />
        <p className="buildnote">Generates the content &amp; schedule. Sending happens in your email platform.</p>
      </div>

      <div className="out">
        {loading && <Loader text="Writing your sequence…" />}
        {!loading && !out && <Empty
          icon={<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>}
          title="Your sequence will appear here" sub="Pick a sequence type and press Build sequence." />}

        {!loading && out && (
          <div className="plan">
            <Block n="1" title="Schedule — ready to import" ai
              right={<>
                <button className="dlbtn" onClick={exportCSV} style={{marginLeft:"auto"}}><DownloadIcon />CSV</button>
                <button className="dlbtn" onClick={exportJSON} style={{marginLeft:8,background:"var(--blue)"}}><DownloadIcon />JSON</button>
              </>}>
              <table className="schedtable"><tbody>
                <tr><th>Send</th><th>Delay from trigger</th><th>Subject</th><th>Goal</th></tr>
                {(out.schedule||[]).map((s,i)=>(
                  <tr key={i}><td>#{s.n}</td><td>{s.delay}</td><td>{s.subject}</td><td>{s.goal}</td></tr>))}
              </tbody></table>
              <p className="disclaimer">
                Trigger: <code>{out.trigger}</code>
                {out.exitRule && <> · Exit: {out.exitRule}</>}
                {out.sendWindow && <> · Send window: {out.sendWindow}</>}
              </p>
            </Block>

            <Block n="2" title="The full sequence" ai>
              <div className="seq">
                {(out.emails||[]).map((e,i)=>(
                  <div className="mail" key={i}>
                    <div className="mail-h">
                      <span className="em">Email {e.n}</span>
                      <span className="when">⏱ {e.delay}</span>
                      <span className="goal">Goal: {e.goal}</span>
                    </div>
                    <p className="subj">{e.subject}</p>
                    {e.preview && <p className="prev">Preview text: {e.preview}</p>}
                    <div className="mbody">
                      {(e.body||[]).map((p,j)=><p key={j}>{p}</p>)}
                      {e.cta && <p><span className="cta-in">{e.cta}</span></p>}
                    </div>
                    {e.note && <p className="mnote">{e.note}</p>}
                    {e.exit && <div className="exit">✕ Exit sequence if: {e.exit}</div>}
                  </div>))}
              </div>
            </Block>

            {out.why?.length>0 && (
              <Block n="3" title="Why this sequence works" ai>
                <ul className="tight">{out.why.map((w,i)=><li key={i}>{w}</li>)}</ul>
                <p className="disclaimer">The tool generates content and schedule. Sending happens in your email platform — export above.</p>
              </Block>)}

            {out.raw && <Block title="Raw output"><pre className="raw">{out.raw}</pre>{out.note && <p className="disclaimer">{out.note}</p>}</Block>}
          </div>)}
      </div>
    </div>
  );
}
