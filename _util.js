const all = require("./polls-data.json");
module.exports = (req, res) => {
  try {
    const race = String(req.query.race || "");
    const polls = all[race] || [];
    const sums = {}, counts = {};
    polls.forEach(p => Object.entries(p.results || {}).forEach(([k, v]) => {
      sums[k] = (sums[k] || 0) + +v; counts[k] = (counts[k] || 0) + 1;
    }));
    const average = {};
    Object.keys(sums).forEach(k => average[k] = sums[k] / counts[k]);
    res.json({ race, polls, average });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
