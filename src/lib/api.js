// Talks to /api/generate. Never sees your API key.
export async function checkAI() {
  try {
    const r = await fetch("/api/generate");
    if (!r.ok) return { aiEnabled: false };
    return await r.json();
  } catch { return { aiEnabled: false }; }
}

export async function generate(type, payload) {
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, payload })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.error || `Request failed (${r.status})`);
  return data;
}

export function download(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows) {
  if (!rows.length) return "";
  const heads = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [heads.join(","), ...rows.map((r) => heads.map((h) => esc(r[h])).join(","))].join("\n");
}
