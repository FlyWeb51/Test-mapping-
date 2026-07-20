// Looks up every FEC-registered candidate for a SEAT (state+district+office+cycle)
// instead of guessing by name. This is the fix for name-search false negatives, and
// it doubles as the "who's in the primary" view: FEC's candidate list for a seat
// includes every filed candidate, not just the current incumbent.
const { cached, H6, FEC_KEY } = require("./_util");
module.exports = async (req, res) => {
  try {
    const { state = "", district = "", office = "H", cycle = "2026" } = req.query;
    if (!state) return res.status(400).json({ error: "state required" });
    const key = FEC_KEY();
    const cacheKey = `race:${state}:${district}:${office}:${cycle}`;
    const data = await cached(cacheKey, H6, async () => {
      let url = `https://api.open.fec.gov/v1/candidates/?api_key=${key}&state=${state}&office=${office}&cycle=${cycle}&per_page=30&sort=name`;
      if (office === "H" && district) url += `&district=${String(district).padStart(2, "0")}`;
      const sr = await (await fetch(url)).json();
      const cands = sr.results || [];
      // Cap concurrent lookups so one page load can't blow through the FEC rate limit.
      const withTotals = await Promise.all(cands.slice(0, 12).map(async c => {
        try {
          const tr = await (await fetch(`https://api.open.fec.gov/v1/candidate/${c.candidate_id}/totals/?api_key=${key}&cycle=${cycle}&sort=-cycle&per_page=1`)).json();
          const t = tr.results && tr.results[0];
          return {
            candidate_id: c.candidate_id, name: c.name, party: c.party,
            incumbent_challenge: c.incumbent_challenge_full,
            totals: t ? { receipts: t.receipts, disbursements: t.disbursements, cash_on_hand: t.last_cash_on_hand_end_period } : null
          };
        } catch { return { candidate_id: c.candidate_id, name: c.name, party: c.party, totals: null }; }
      }));
      return { count: withTotals.length, candidates: withTotals };
    });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
