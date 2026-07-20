# Election Center — Vercel deployment

One project, frontend + backend, free tier.

## Deploy (about 15 minutes, no command line needed)

1. Put this folder in a GitHub repository
   (github.com → New repository → "uploading an existing file" → drag everything in)
2. Go to vercel.com → Continue with GitHub → Add New Project → Import that repo
3. Before hitting Deploy, open "Environment Variables" and add:
   - FEC_API_KEY = your key from api.data.gov/signup
   - CENSUS_API_KEY = your key from api.census.gov/data/key_signup.html
4. Deploy. Your site is live at yourproject.vercel.app

## How updates work

Edit any file on GitHub (including data/polls.json to add a poll) and commit —
Vercel redeploys automatically in about a minute. That's your publishing flow:
poll drops → edit polls.json on the GitHub website → live in 60 seconds.

## Layout

- index.html — the whole frontend (map, ratings, filters)
- api/ — serverless endpoints: /api/fec/totals, /api/fec/ie,
  /api/census/district, /api/polls, /api/fcc/folder
- data/polls.json — your manual polling table (mean average computed per race)

Keys live only in Vercel's Environment Variables dashboard, never in the code.
