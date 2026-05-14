const AT_BASE  = "appIlmHzRUNbuPCxA";
const AT_TABLE = "tbl19dkWYDkpQeGFH";
const AT_VIEW  = "viwr5WVSy0V0n0czP";
const ALLOWED_ORIGINS = ["https://uihwanshin.github.io", "http://localhost"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return cors(null, 204, origin);
    if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cors(JSON.stringify({error:"Forbidden"}), 403, origin);
    const url = new URL(request.url);
    if (url.pathname !== "/airtable") return cors(JSON.stringify({error:"Not found"}), 404, origin);
    try {
      let all = [], offset = null;
      do {
        const u = new URL(`https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}`);
        u.searchParams.set("view", AT_VIEW);
        u.searchParams.set("pageSize", "100");
        u.searchParams.set("fields[]", "지점명(slack)");
        u.searchParams.set("fields[]", "사업자유형");
        if (offset) u.searchParams.set("offset", offset);
        const r = await fetch(u.toString(), {headers:{Authorization:`Bearer ${env.AIRTABLE_TOKEN}`}});
        const d = await r.json();
        if (!r.ok) return cors(JSON.stringify({error:d.error}), r.status, origin);
        all = all.concat(d.records||[]);
        offset = d.offset||null;
      } while(offset);
      const map = {};
      all.forEach(rec => {
        const b = String(rec.fields["지점명(slack)"]||rec.fields["지점명"]||"").trim();
        const t = String(rec.fields["사업자유형"]||"").trim();
        if (!b) return;
        if (!map[b]) map[b] = {individual:0, corporate:0};
        if (t==="개인사업자") map[b].individual++;
        else if (t==="법인사업자") map[b].corporate++;
      });
      return cors(JSON.stringify({map, total:all.length, updatedAt:new Date().toISOString()}), 200, origin);
    } catch(e) {
      return cors(JSON.stringify({error:e.message}), 500, origin);
    }
  }
};

function cors(body, status, origin) {
  return new Response(body, {status, headers:{
    "Content-Type":"application/json",
    "Access-Control-Allow-Origin": origin||"*",
    "Access-Control-Allow-Methods":"GET, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
  }});
}
