// FCC public political-files crawler
// Confirmed working chain (tested live against KPHO-TV, Phoenix):
//   1. Facility search API   -> facility id + callsign slug
//   2. publicfiles.fcc.gov station political-files pages (HTML) -> year -> category ->
//      org/candidate -> subfolder -> files, each folder/file keyed by a real GUID
// The documented OPIF "Manager" JSON API (folder/path, folder/id, file/id) requires an
// `entityId` tied to an authenticated CORES/filer login — not derivable from any public
// endpoint, confirmed by testing facility id, FRN, and LMS app IDs, all rejected.
// So this reader crawls the public HTML tree instead, same approach the guide's Phase 7
// called for, just recursive now that we know the tree shape.

const cheerio = require("cheerio");

const ALLOWED_HOST = "publicfiles.fcc.gov";
function isAllowedFccUrl(value) {
  try { const u = new URL(value); return u.protocol === "https:" && u.hostname === ALLOWED_HOST; }
  catch { return false; }
}
function normalizeText(v) { return String(v || "").replace(/\s+/g, " ").trim(); }

async function fetchHtml(url) {
  if (!isAllowedFccUrl(url)) throw new Error("Only FCC Public Files URLs are allowed.");
  const r = await fetch(url, {
    headers: {
      "User-Agent": "CandidateStandingWebsite/0.2 (research contact@example.com)",
      "Accept": "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error(`FCC page failed: ${r.status} ${r.statusText}`);
  return r.text();
}

// Look up a station's facility id + confirm callsign via the public Service Data API
// (GET /api/service/facility/search/{callsign} — confirmed working, no auth needed)
async function searchFacility(callsign) {
  const url = `https://publicfiles.fcc.gov/api/service/facility/search/${encodeURIComponent(callsign)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`facility search failed: ${r.status}`);
  const data = await r.json();
  const first = Array.isArray(data) ? data[0] : (data.results || data)[0];
  if (!first) throw new Error("no facility found for that callsign");
  return first; // includes facilityId, callSign, licenseeName, city, state, serviceType
}

// One folder page: pull sub-folder links and file links apart.
function parseFolderPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const folders = [], files = [];
  $("a").each((_, elem) => {
    const href = $(elem).attr("href");
    const title = normalizeText($(elem).text());
    if (!href) return;
    let absolute;
    try { absolute = new URL(href, pageUrl).toString(); } catch { return; }
    if (!isAllowedFccUrl(absolute)) return;
    const nearby = normalizeText($(elem).closest("tr, li, div").text());
    const isPdf = /\.pdf(?:$|\?)/i.test(absolute) || /\/download\//.test(absolute);
    if (isPdf) {
      const dateMatch = nearby.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
      const sizeMatch = nearby.match(/\b\d+(?:\.\d+)?\s*(?:KB|MB)\b/i);
      files.push({
        title: title || "FCC political-file document",
        documentUrl: absolute,
        dateUploaded: dateMatch ? dateMatch[0] : null,
        displayedSize: sizeMatch ? sizeMatch[0] : null,
        rawRowText: nearby
      });
    } else if (/political-files/.test(absolute) && absolute !== pageUrl && title) {
      // A sub-folder link: year, category (Federal/Non-Candidate), org/candidate, or ORDER/INVOICE subfolders
      folders.push({ title, url: absolute });
    }
  });
  return { folders: [...new Map(folders.map(f => [f.url, f])).values()], files };
}

// Recursively crawl from a root political-files URL, following sub-folders up to maxDepth,
// capped at maxPages fetches so one request can't be turned into an unbounded crawl.
async function crawlPoliticalFiles(rootUrl, { maxDepth = 4, maxPages = 40 } = {}) {
  if (!isAllowedFccUrl(rootUrl)) throw new Error("Only FCC Public Files URLs are allowed.");
  const records = [];
  let pagesFetched = 0;
  const seen = new Set();
  async function walk(url, breadcrumb, depth) {
    if (depth > maxDepth || pagesFetched >= maxPages || seen.has(url)) return;
    seen.add(url); pagesFetched++;
    let html;
    try { html = await fetchHtml(url); } catch (e) { return; }
    const { folders, files } = parseFolderPage(html, url);
    files.forEach(f => records.push({ ...f, folderPath: breadcrumb.join(" / "), folderUrl: url }));
    for (const f of folders) {
      if (pagesFetched >= maxPages) break;
      await walk(f.url, [...breadcrumb, f.title], depth + 1);
    }
  }
  await walk(rootUrl, [], 0);
  return { records: [...new Map(records.map(r => [r.documentUrl, r])).values()], pagesFetched, truncated: pagesFetched >= maxPages };
}

module.exports = async (req, res) => {
  try {
    const { callsign = "", url = "", station = "" } = req.query;
    let rootUrl = url;
    let facility = null;

    if (!rootUrl && callsign) {
      facility = await searchFacility(callsign);
      // Public political-files root follows this pattern once you know the station slug.
      const slug = (station || facility.callSign || callsign).toLowerCase().replace(/-tv$|-fm$|-am$/i, "");
      rootUrl = `https://publicfiles.fcc.gov/tv-profile/${slug}/political-files/`;
    }
    if (!rootUrl) return res.status(400).json({ error: "Provide either ?callsign=KPHO or ?url=<political-files folder URL>" });

    if (/\/political-files\/?$/.test(rootUrl)) {
      const { records, pagesFetched, truncated } = await crawlPoliticalFiles(rootUrl);
      return res.json({ facility, rootUrl, count: records.length, pagesFetched, truncated, records });
    } else {
      // A specific sub-folder URL: single-level read, same as before, plus its sub-folders.
      const { records, pagesFetched, truncated } = await crawlPoliticalFiles(rootUrl, { maxDepth: 3, maxPages: 25 });
      return res.json({ facility, rootUrl, count: records.length, pagesFetched, truncated, records });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
