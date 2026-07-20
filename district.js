// fcc-reader.js - Node.js 18+
// npm install cheerio
const cheerio = require("cheerio");
function isAllowedFccUrl(value) {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "publicfiles.fcc.gov";
}
async function fetchHtml(url) {
  if (!isAllowedFccUrl(url)) throw new Error("Only FCC Public Files URLs are allowed.");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CandidateStandingWebsite/0.1 (research contact@example.com)",
      "Accept": "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
    throw new Error(`FCC page failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}
function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
async function readPoliticalFolder(folderUrl) {
  const html = await fetchHtml(folderUrl);
  const $ = cheerio.load(html);
  const records = [];
  // FCC pages may change markup, so examine every link that appears to be a PDF.
  $("a").each((_, element) => {
    const href = $(element).attr("href");
    const title = normalizeText($(element).text());
    if (!href) return;
    const absolute = new URL(href, folderUrl).toString();
    const nearby = normalizeText($(element).closest("tr, li, div").text());
    const looksLikePdf = /\.pdf(?:$|\?)/i.test(absolute) || /pdf/i.test(nearby);
    if (!looksLikePdf || !isAllowedFccUrl(absolute)) return;
    const dateMatch = nearby.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    const sizeMatch = nearby.match(/\b\d+(?:\.\d+)?\s*(?:KB|MB)\b/i);
    records.push({
      title: title || "FCC political-file document",
      documentUrl: absolute,
      dateUploaded: dateMatch ? dateMatch[0] : null,
      displayedSize: sizeMatch ? sizeMatch[0] : null,
      folderUrl,
      rawRowText: nearby
    });
  });
  // Remove duplicate links.
  return [...new Map(records.map(r => [r.documentUrl, r])).values()];
}
module.exports = { readPoliticalFolder };
