// Benchmark ranges are illustrative UAE planning figures — tune to your own data.
export const PLATFORMS = {
  meta:{label:"Meta (Facebook & Instagram)",short:"Meta",cpm:[28,55],cpc:[2.4,5.2],
    formats:["9:16 Reels / Stories video","Feed carousel (3–5 cards)","Single-image offer","UGC testimonial video","Advantage+ catalogue"]},
  google:{label:"Google (Search, PMax, YouTube)",short:"Google",cpm:[20,45],cpc:[3,9],
    formats:["Responsive Search Ads","Performance Max asset group","YouTube 6s bumper","Display remarketing"]},
  tiktok:{label:"TikTok",short:"TikTok",cpm:[18,40],cpc:[1.8,4.5],
    formats:["Spark Ads (boosted native post)","9:16 hook-led video <15s","Creator / UGC demo","Carousel image ads"]},
  snapchat:{label:"Snapchat",short:"Snapchat",cpm:[15,35],cpc:[1.5,4],
    formats:["9:16 Snap Ad (3–5s hook)","Story Ad","Collection Ad","AR Lens"]},
  linkedin:{label:"LinkedIn",short:"LinkedIn",cpm:[60,140],cpc:[12,30],
    formats:["Single-image sponsored post","Document / carousel ad","Lead-gen form ad","Thought-leader video"]},
  x:{label:"X (Twitter)",short:"X",cpm:[20,50],cpc:[2,6],
    formats:["Image / video post ad","Vertical video ad","Carousel ad","Trend takeover"]}
};

export const OBJECTIVES = {
  leads:{label:"Leads / enquiries",meta:"Lead generation (forms + WhatsApp)",kpi:"CPL"},
  sales:{label:"Online sales",meta:"Conversions / Catalogue sales",kpi:"ROAS"},
  visits:{label:"Store visits / footfall",meta:"Store traffic",kpi:"CPC"},
  awareness:{label:"Awareness / reach",meta:"Reach & brand awareness",kpi:"CPM"},
  engagement:{label:"Engagement",meta:"Engagement & community",kpi:"CPE"},
  installs:{label:"App installs",meta:"App promotion",kpi:"CPI"}
};

export const LANGUAGES = { en:"English", ar:"Arabic", both:"English + Arabic" };

export const FIT = {
  leads:{meta:5,google:5,tiktok:3,snapchat:2,linkedin:4,x:2},
  sales:{meta:5,google:5,tiktok:4,snapchat:2,linkedin:1,x:2},
  visits:{meta:5,google:4,tiktok:4,snapchat:3,linkedin:1,x:2},
  awareness:{meta:4,google:3,tiktok:5,snapchat:4,linkedin:2,x:4},
  engagement:{meta:5,google:2,tiktok:5,snapchat:4,linkedin:3,x:5},
  installs:{meta:5,google:4,tiktok:4,snapchat:4,linkedin:1,x:2}
};

export const AUDIENCE = {
  meta:(a)=>`Build 3 sets: (1) broad / Advantage+ and let creative do the targeting for ${a}; (2) a 1–3% Lookalike of your customer list; (3) retargeting of site visitors, video-viewers and engagers (30d). Modern Meta rewards broad + strong creative.`,
  google:(a)=>`Target intent, not people. Tight keyword themes around what ${a} actually searches, plus a Performance Max asset group with audience signals. Add remarketing lists and a negative-keyword list to cut waste.`,
  tiktok:(a)=>`Start broad and let the system find ${a}; add interest/behaviour clusters and creator targeting. Retarget video-viewers (25%+) and profile engagers. Native, sound-on creative matters more than tight targeting.`,
  snapchat:(a)=>`Focus on ${a} skewed under 35: Snap Lifestyle Categories, location radius, and a Lookalike of your customer list. Retarget Snap engagers and Pixel visitors. Hook in the first 2 seconds.`,
  linkedin:(a)=>`Target ${a} by job title, seniority, function, industry and company size. Keep audiences 50k–400k. Add matched-audience retargeting. Best for B2B and high-value services.`,
  x:(a)=>`Reach ${a} via follower look-alikes, keyword & conversation targeting and interest categories. Strongest around events, launches and trending moments.`
};

export const COMPLIANCE = [
  {match:["real estate","property","realty","broker","apartment","villa","rent"],flags:[
    "Real estate ads need RERA/DLD compliance — include your permit/ORN and Trakheesi permit where required.",
    "Never advertise a property or price you can't honour; portals and Meta both police this."]},
  {match:["clinic","health","medical","dental","derma","aesthetic","hospital","pharmacy","doctor"],flags:[
    "Healthcare ads require DHA / DoH / MOHAP compliance — claims, before/afters and doctor titles are regulated.",
    "Avoid guaranteed-outcome language; it will be rejected and may breach health-authority rules."]},
  {match:["loan","finance","credit","invest","bank","insurance","crypto"],flags:[
    "Financial promotions are regulated by the UAE Central Bank / SCA — disclaimers and licensing usually apply.",
    "Meta & Google restrict finance/crypto ads; expect advertiser verification."]},
  {match:["supplement","weight loss","slimming","cosmetic","beauty"],flags:[
    "Health & beauty claims must be substantiated — no miracle-cure or guaranteed-result wording.",
    "Before/after imagery is restricted on Meta; use lifestyle framing instead."]}
];
export const COMPLIANCE_DEFAULT = [
  "Confirm your ad account is linked to a valid UAE trade licence — Meta/Google may request it.",
  "Keep claims truthful and substantiated; avoid absolutes ('best', 'No.1') unless provable.",
  "If you collect leads, state how data is used — UAE PDPL expectations apply."
];

export const N8N_APPS = {
  googleSheets:"Google Sheets", ai:"AI (LLM)", telegram:"Telegram", gmail:"Gmail",
  slack:"Slack", airtable:"Airtable", httpRequest:"HTTP Request", webhook:"Webhook", code:"Code"
};

export const CONTENT_TYPES = {
  adsMeta:"Ad copy per platform", bilingual:"English + Arabic",
  hooks:"Hooks & video scripts", email:"Email + landing copy", social:"Social captions"
};
