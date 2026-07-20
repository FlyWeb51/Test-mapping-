// Shared helpers for the serverless endpoints
const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}
module.exports = { cached, H6: 6*3600*1000, D30: 30*86400*1000,
  FEC_KEY: () => process.env.FEC_API_KEY || "DEMO_KEY",
  CENSUS_KEY: () => process.env.CENSUS_API_KEY || "" };
