import React, { useState } from "react";
import { N8N_APPS } from "../lib/data.js";
import { generate, download } from "../lib/api.js";
import { Block, Field, Checks, BuildBtn, ErrBox, Loader, Empty, KeyBanner, DownloadIcon } from "../lib/ui.jsx";

export default function N8n({ go, ai }) {
  const [f, setF] = useState({
    description: "", trigger: "schedule", frequency: "daily",
    apps: ["googleSheets", "ai", "telegram"], conditions: ""
  });
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function run() {
    if (!f.description.trim()) return setErr("Describe what the workflow should do.");
    if (!ai?.aiEnabled) return setErr("This tool needs an API key. See the Setup Guide.");
    setErr(""); setLoading(true); setOut(null);
    try { setOut(await generate("n8n", f)); }
    catch (e) { setErr(e.message); }
    setLoading(false);
    setTimeout(() => document.querySelector(".out")?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  }

  const fileName = (out?.workflow?.name || "workflow").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";

  return (
    <div>
      <div className="crumb"><a onClick={() => go("home")}>← All tools</a> <span>/</span> <span>n8n Workflow Generator</span></div>
      {!ai?.aiEnabled && <KeyBanner onDocs={() => go("docs")} text={<><b>This tool needs an API key.</b> Workflows are composed from a library of verified n8n nodes and validated before download, so the JSON imports cleanly. </>} />}

      <div className="card console">
        <div className="hd"><span className="tag">Brief</span><h3>Describe your automation</h3></div>
        <div className="form-grid">
          <Field label="What should this workflow do?" req full>
            <textarea style={{ minHeight: 92 }} value={f.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Every morning at 8am, fetch new leads from a Google Sheet, use AI to score each lead 1–10, then send me a Telegram summary of anyone scoring 8 or above." /></Field>
          <Field label="Trigger type"><select value={f.trigger} onChange={(e) => set("trigger", e.target.value)}>
            <option value="schedule">Schedule (time-based)</option><option value="webhook">Webhook (incoming request)</option><option value="manual">Manual</option></select></Field>
          <Field label="How often?"><select value={f.frequency} onChange={(e) => set("frequency", e.target.value)}>
            <option value="daily">Daily</option><option value="hourly">Hourly</option><option value="weekly">Weekly</option><option value="every 15 minutes">Every 15 minutes</option></select></Field>
          <div className="f spanfull"><span className="lblspan">Apps &amp; services involved</span>
            <Checks options={N8N_APPS} value={f.apps} onChange={(v) => set("apps", v)} /></div>
          <Field label="Any conditions or filtering?" full>
            <input type="text" value={f.conditions} onChange={(e) => set("conditions", e.target.value)} placeholder="e.g. Only notify for leads scoring 8 or above" /></Field>
        </div>
        <ErrBox>{err}</ErrBox>
        <BuildBtn loading={loading} onClick={run} label="Generate workflow" loadingLabel="Composing and validating…" />
        <p className="buildnote">Composed from verified nodes and validated before download.</p>
      </div>

      <div className="out">
        {loading && <Loader text="Composing and validating your workflow…" />}
        {!loading && !out && <Empty
          icon={<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M5 8.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg>}
          title="Your workflow will appear here" sub="Describe the automation and press Generate workflow." />}

        {!loading && out && (
          <div className="plan">
            <Block n="1" title="What this workflow does" ai>
              <p className="ptxt" style={{ marginBottom: 14 }}>{out.summary}</p>
              {out.flow?.length > 0 && <div className="nodeflow">
                {out.flow.map((n, i) => (
                  <React.Fragment key={i}>
                    <div className={"node " + (n.kind || "action")}><span className="nd" />{n.name}</div>
                    {i < out.flow.length - 1 && <span className="arrow">→</span>}
                  </React.Fragment>))}
              </div>}
              {out.unsupported && <div className="notdoing" style={{ marginTop: 14 }}><b>Note:</b> {out.unsupported}</div>}
              <p className="disclaimer">{out.workflow?.nodes?.length || 0} nodes · composed from the verified node library</p>
            </Block>

            <Block n="2" title="Workflow JSON" ai>
              <p className="ptxt">Download this file, then in n8n go to <b>Workflows → Import from File</b>.</p>
              <div className="jsonbox">
                <div className="json-h"><span>{fileName}</span>
                  <button className="dlbtn" onClick={() => download(fileName, JSON.stringify(out.workflow, null, 2))}>
                    <DownloadIcon />Download JSON</button></div>
                <pre>{JSON.stringify(out.workflow, null, 2)}</pre>
              </div>
              {out.validation && (out.validation.ok
                ? <div className="valid ok">✓ Validated — every node type and connection checks out. This will import cleanly.</div>
                : <div className="valid bad"><div><b>Validation warnings:</b><ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {out.validation.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>
                    <p style={{ margin: "8px 0 0", fontSize: 12 }}>Import may fail. Try regenerating, or use a stronger model.</p></div></div>)}
            </Block>

            {out.manual?.length > 0 && (
              <Block n="3" title="Setup manual — connect every node" ai>
                {out.manual.map((m, i) => (
                  <div className="mstep" key={i}><span className="mn">{m.step || i + 1}</span>
                    <div className="mb"><b>{m.title}</b><p>{m.body}</p>
                      {m.credential && <div className="cred">Replaces: <code>{m.credential}</code></div>}</div></div>))}
                <p className="disclaimer">Every <code>REPLACE_ME</code> is intentional — credentials never travel inside a workflow file.</p>
              </Block>)}

            {out.raw && <Block title="Raw output"><pre className="raw">{out.raw}</pre>{out.note && <p className="disclaimer">{out.note}</p>}</Block>}
          </div>)}
      </div>
    </div>
  );
}
