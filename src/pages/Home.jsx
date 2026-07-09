import React from "react";
import { Arrow } from "../lib/ui.jsx";

const TOOLS = [
  { id:"planner", cls:"b", title:"Campaign Planning",
    desc:"Turn a business brief into a complete 15-section campaign plan — strategy, budget split, testing roadmap and a week-by-week playbook.",
    pills:["Overview","Content","15 sections"],
    icon:<svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg> },
  { id:"n8n", cls:"p", title:"n8n Workflow Generator",
    desc:"Describe the automation you want. Get importable n8n JSON plus a step-by-step manual for connecting every node and going live.",
    pills:["Download JSON","Setup manual","Verified nodes"],
    icon:<svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M5 8.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/><path d="M12 13.5v2"/></svg> },
  { id:"youtube", cls:"r", title:"YouTube Script Generator",
    desc:"A full word-for-word script you can read on camera — hook, spoken VO, delivery notes, on-screen text and b-roll direction.",
    pills:["Full VO","Timestamps","Delivery notes"],
    icon:<svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4z"/><path d="M10 9l5 3-5 3z"/></svg> },
  { id:"email", cls:"y", title:"Email Sequence Builder",
    desc:"A complete scheduled sequence — triggers, delays, subject lines, full body copy and exit rules. Export straight into your email platform.",
    pills:["Schedule table","Full copy","Export CSV/JSON"],
    icon:<svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg> },
  { id:"adcopy", cls:"g", title:"Ad Copy Generator",
    desc:"Paste a website. It reads the brand, learns the voice, and writes platform-ready ad copy in English and native Arabic.",
    pills:["Reads your site","EN + AR","Per platform"],
    icon:<svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> }
];

export default function Home({ go }) {
  return (
    <div>
      <div className="hero">
        <h2>Marketing work, <em>done in minutes</em>.</h2>
        <p>A free, open-source suite of AI marketing tools. Pick a tool, fill a brief, get launch-ready output. Deploy your own copy in 15 minutes.</p>
        <div className="herokey">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          <span>Every tool runs on your own AI key — or free &amp; offline with Ollama.</span>
          <a onClick={() => go("docs")}>Read the 2-minute setup guide →</a>
        </div>
      </div>

      <div className="tools">
        {TOOLS.map((t) => (
          <div key={t.id} className={"tool " + t.cls} onClick={() => go(t.id)}>
            <div className="ic">{t.icon}</div>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
            <div className="pills">{t.pills.map((p) => <span key={p}>{p}</span>)}</div>
            <div className="go">Open tool <Arrow /></div>
          </div>
        ))}
        <div className="tool soon">
          <div className="ic"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
          <h3>More coming</h3>
          <p>Arabic localization studio, UGC creator briefs, landing-page generator, competitor teardown. Open source — suggest one, or build it yourself.</p>
          <div className="pills"><span>Contribute</span></div>
          <div className="go">On the roadmap</div>
        </div>
      </div>
    </div>
  );
}
