# Election Center — Vercel (v2, flat layout)

Repo needs exactly this at the top level: index.html, package.json, README.md,
and ONE folder named api containing 7 files. That's it.

Endpoints: /api/fec-totals, /api/fec-ie, /api/census-district, /api/polls, /api/fcc-folder
Add a poll: edit api/polls-data.json on GitHub, commit — Vercel redeploys automatically.
Keys: Vercel project → Settings → Environment Variables → FEC_API_KEY, CENSUS_API_KEY → then Redeploy.
