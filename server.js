// Keepa Price Lookup — Proxy Server
// Deploy to Railway. Set KEEPA_API_KEY as an environment variable.
// The frontend calls this server instead of Keepa directly,
// so your API key is never exposed in the browser.

const http = require('http');
const https = require('https');
const url = require('url');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

if (!KEEPA_API_KEY) {
  console.error('ERROR: KEEPA_API_KEY environment variable is not set.');
  process.exit(1);
}

// CORS headers — allow requests from any origin (your GitHub Pages site)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function sendJson(res, status, data) {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(data));
}

function fetchKeepa(asins, domain) {
  return new Promise((resolve, reject) => {
    const keepaUrl = 'https://api.keepa.com/product?key=' + KEEPA_API_KEY +
      '&domain=' + domain + '&asin=' + asins + '&stats=1&buybox=1';

    const options = new URL(keepaUrl);
    https.get(options, (res) => {
      // Handle gzip/deflate compressed responses
      let stream = res;
      const encoding = res.headers['content-encoding'];
      if (encoding === 'gzip') {
        stream = res.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        stream = res.pipe(zlib.createInflate());
      }

      let body = '';
      stream.on('data', chunk => body += chunk);
      stream.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error('Keepa returned ' + res.statusCode + ': ' + body.slice(0, 200)));
          return;
        }
        let parsed;
        try { parsed = JSON.parse(body); }
        catch(e) {
          reject(new Error('Failed to parse Keepa response: ' + body.slice(0, 200)));
          return;
        }
        if (parsed.error) {
          reject(new Error('Keepa error: ' + parsed.error));
          return;
        }
        resolve(parsed);
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health check endpoint
  if (path === '/health') {
    sendJson(res, 200, { ok: true, message: 'Keepa proxy is running' });
    return;
  }

  // Main lookup endpoint: /lookup?asin=B08BG7N16C,B09QQRKDHN&domain=1
  if (path === '/lookup') {
    const { asin, domain = '1' } = parsed.query;

    if (!asin) {
      sendJson(res, 400, { error: 'Missing ?asin= parameter' });
      return;
    }

    // Validate ASINs
    const asins = asin.split(',').map(a => a.trim().toUpperCase());
    const invalid = asins.filter(a => !/^[A-Z0-9]{10}$/.test(a));
    if (invalid.length) {
      sendJson(res, 400, { error: 'Invalid ASINs: ' + invalid.join(', ') });
      return;
    }
    if (asins.length > 100) {
      sendJson(res, 400, { error: 'Max 100 ASINs per request' });
      return;
    }

    const validDomains = ['1','2','3','4','5','6','7','8','9','10'];
    if (!validDomains.includes(domain)) {
      sendJson(res, 400, { error: 'Invalid domain' });
      return;
    }

    try {
      console.log('[lookup]', asins.length, 'ASINs, domain', domain);
      const data = await fetchKeepa(asins.join(','), domain);
      sendJson(res, 200, data);
    } catch(err) {
      console.error('[lookup error]', err.message);
      sendJson(res, 502, { error: err.message });
    }
    return;
  }

  // 404 for anything else
  sendJson(res, 404, { error: 'Not found. Use /lookup?asin=...&domain=1' });
});

server.listen(PORT, () => {
  console.log('Keepa proxy running on port', PORT);
  console.log('API key loaded:', KEEPA_API_KEY.slice(0,6) + '...' + KEEPA_API_KEY.slice(-4));
});
