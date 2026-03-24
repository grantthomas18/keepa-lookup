# Keepa Price Lookup

## Files
- `index.html` — the frontend app (deploy to GitHub Pages)
- `server.js` — the proxy server (deploy to Railway)
- `package.json` — Node.js config for Railway

---

## Deploying the Proxy to Railway

The proxy server keeps your Keepa API key off the browser and lets anyone
on your team use the app without needing their own key.

### Step 1 — Create a Railway account
Go to [railway.app](https://railway.app) and sign up (free tier is fine).

### Step 2 — Create a new project
- Click **New Project** → **Deploy from GitHub repo**
- Connect your GitHub account and select your `keepa-lookup` repo
- Railway will auto-detect Node.js and deploy `server.js`

### Step 3 — Add your API key as an environment variable
- In your Railway project, click **Variables**
- Add: `KEEPA_API_KEY` = your full Keepa API key
- Click **Deploy** — Railway will restart with the key loaded

### Step 4 — Get your proxy URL
- Click **Settings** → **Domains** → **Generate Domain**
- Copy the URL (e.g. `https://keepa-proxy-production.up.railway.app`)

### Step 5 — Configure the frontend
- Open your GitHub Pages app
- Click **Settings** → switch mode to **Proxy (server)**
- Paste the Railway URL and click **Save**
- Click **Test** to confirm it's working

---

## Using the App

### Direct mode (browser)
- Your Keepa API key is stored in your browser's localStorage
- Works on one computer only
- No server needed

### Proxy mode (server)
- API key lives on Railway, never in the browser
- Works on any computer — just share the proxy URL
- All team members use the same proxy

---

## Marketplaces
| Button | Domain | Marketplace |
|--------|--------|-------------|
| 🇺🇸 US | 1 | Amazon.com |
| 🇬🇧 UK | 2 | Amazon.co.uk |
| 🇩🇪 DE | 3 | Amazon.de |

---

## Columns
| Column | Source | Notes |
|--------|--------|-------|
| Buy Box | `stats.buyBoxPrice` | Current winning buy box price |
| List Price | `stats.current[4]` | MSRP/listing price — only shown when different from buy box |
| Sales Rank | `stats.current[3]` | Current BSR |
| Rating | `stats.current[16] / 10` | Star rating (e.g. 46 → 4.6★) |
| Reviews | `stats.current[17]` | Total review count |
