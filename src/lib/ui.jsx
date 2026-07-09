import React from "react";

export const Spark = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
);
export const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
export const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
);

export function Loader({ text = "Working…" }) {
  return (
    <div className="loading card">
      <div className="gspin"><span></span><span></span><span></span><span></span></div>
      <p>{text}</p>
    </div>
  );
}

export function Empty({ icon, title, sub }) {
  return (
    <div className="empty card">
      <div className="ic">{icon}</div>
      <h4>{title}</h4><p>{sub}</p>
    </div>
  );
}

export function Block({ n, title, ai, right, children }) {
  return (
    <div className="block">
      <div className="b-hd">
        {n && <span className="n">{n}</span>}
        <h4>{title}</h4>
        {ai && <span className="aitag"><Spark />AI</span>}
        {right}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, req, hint, children, full }) {
  return (
    <label className={"f" + (full ? " spanfull" : "")}>
      <span>{label} {req && <b className="req">*</b>}</span>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </label>
  );
}

export function Checks({ options, value, onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="checks">
      {Object.entries(options).map(([k, label]) => (
        <button type="button" key={k} className={"chk" + (value.includes(k) ? " on" : "")} onClick={() => toggle(k)}>
          <span className="box">{value.includes(k) && <Check />}</span>{label}
        </button>
      ))}
    </div>
  );
}

export function BuildBtn({ loading, onClick, label = "Generate", loadingLabel = "Working…" }) {
  return (
    <button className="build" onClick={onClick} disabled={loading}>
      {loading ? <span className="spin" /> : <Spark />}
      {loading ? loadingLabel : label}
    </button>
  );
}

export function ErrBox({ children }) { return children ? <div className="err">{children}</div> : null; }

export function KeyBanner({ onDocs, text }) {
  return (
    <div className="keybanner">
      <span className="kb-ic"><Spark /></span>
      <div className="kb-txt">
        {text || <><b>Add an API key for the best output.</b> Every tool runs on your own key — any provider, or Ollama locally for free. </>}
        <a onClick={onDocs}>Read the 2-minute setup guide →</a>
      </div>
    </div>
  );
}

export function CopyBtn({ text, rtl }) {
  const [done, setDone] = React.useState(false);
  return (
    <button className={"copybtn" + (done ? " done" : "")} onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); });
    }}>{done ? (rtl ? "تم" : "Copied") : (rtl ? "نسخ" : "Copy")}</button>
  );
}
