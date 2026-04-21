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

// ---------------------------------------------------------------------------
// Embedded favicon assets. Letter "K" with an upward price-trend arrow on a
// Keepa-orange background. Embedded here so the server remains a single-file,
// zero-dependency deploy with no filesystem reads on Railway.
// ---------------------------------------------------------------------------
const FAVICON_ICO = Buffer.from(
  'AAABAAIAEBAAAAAAIAAjAgAAJgAAACAgAAAAACAAkgIAAEkCAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAHqSURBVHicjdO/b41RGAfwzznve3uvqw2NCPFrYEEYJDYhjYgIZnQzYdDEyiBGg0EwKJF0auIPkBhoGsRkMBARIZKmicTS+lHl3vc9hlMtJY2znDznnOf5fp/v8z0hDWvjsuCkpBfB0ispTOm67oxLIQ27ZrkhMxAJBaki1fl5KAgxx6maO0ML31wMadhXQUsSdAVdlGjMvfyeqHJtzXkOSYHapxJtIt2aDXtZv5/JMSafEBJbj9G/na8TvLqT0YMgE1xRztPs1Gw8xK4LlMt4/ZidhzlwN6M+PJGZNOJCe6Q4L01A5wt1h5kPrFzBvtv57ukQL+/SKEjpd0FDtDiMDYoWA1dpr+PtKM9v0Cqpq8UFlH9EcS7cMZSTPz5j/DRFJNQUzUy/7iyk/GvQf60QskabjjD4jk1H6SAWiwrU3by/uM6bEVbvZuAW3SprtGYPqUtrlTyFsKiFX/SqWcbPsf4gWwbZMUazn7KH0W2UkZ4MGJFVSWj0ZhHba5ma5tGpXHjfbfo2Mz5EPUtnZt7wJYJUZedN3Kf+kY3UG3h/jwfHs5GmX1MEC5AZN6Rh06I+FaolrFzItHNuUkgq3yKuaAqioBFpN+bcJs+8WbC8kfeF2QUtUXAnJIKbLimdVen3P985+qw2gvM/AVaApF93ZwdQAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACWUlEQVR4nMWXz2sTQRTHPzOJptIeGqyCBtRTD/6gUAsqVqIYbz1IhAqt0IJYQULQP6AI4s2DWiM2RbSHqlToRRDBSAVRC6JBrRapIBT1YiuhodIkJBkPa2g22aTZbdz9wjDMzNv3/TLvzdsZwT+oITx4OAv0ALuBRuqLRSCO4KYYYKIwKQDULXxIHgNtdSathHHS9IkwabcawmMzOcBJ1pMFTgkVJQxct5G8GF0SQa9D5AAhiWKngwL2S6DJQQHN7qrLA0o/HhHlNq39cPiufu7LbXhxpiYFsiarSvDugs6Ifu73B3gdrtmFdQHuRgg81PoC0gmIBSG7bIOAzgh4i/JX5WGyF5LfTLmxJqC1X2vFiF+C709MuzIvwCjuP2IQv2zalXkBRnFfmoPJHlA5GwSUxj2XgqcnILVgidy8gNK4vwrBwjvL5ADVC9FasGEz+O+Ay6ON5x7BpxtlZuZ2YHZUPz4YgU0d1b/Z4gdfAHYEDZfNCXgZgsTMytjVAMcmoKGl3Hb5Fyx+BbkO8tmKLs0JyP6BZ91aX0DTNjj6AIRLb3vgKuw5D9PX4GcMcsbV0XwdSHzWdqIYvgC0DxqTT12A531aM4C1JJwdha1+/aloH4T5N9DSoScHSM1XdGX9X1CaD0LCkTGQEt5eXCFfBdYFGOWDxwvbj8PHKzW7Wdt9wCgfNrbBoWjNLoSKolY3+3+QQNJB/qREMeUYvWJGIigv0HZBcE97Gw4z5sAD5T1e9mmnIMNpYNxW8jxdopuM7qKvhgkiOAfsBZrrTLoETAP38TIiuskA/AXy+J+/IlLqSAAAAABJRU5ErkJggg==',
  'base64'
);
const FAVICON_PNG_32 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACWUlEQVR4nMWXz2sTQRTHPzOJptIeGqyCBtRTD/6gUAsqVqIYbz1IhAqt0IJYQULQP6AI4s2DWiM2RbSHqlToRRDBSAVRC6JBrRapIBT1YiuhodIkJBkPa2g22aTZbdz9wjDMzNv3/TLvzdsZwT+oITx4OAv0ALuBRuqLRSCO4KYYYKIwKQDULXxIHgNtdSathHHS9IkwabcawmMzOcBJ1pMFTgkVJQxct5G8GF0SQa9D5AAhiWKngwL2S6DJQQHN7qrLA0o/HhHlNq39cPiufu7LbXhxpiYFsiarSvDugs6Ifu73B3gdrtmFdQHuRgg81PoC0gmIBSG7bIOAzgh4i/JX5WGyF5LfTLmxJqC1X2vFiF+C709MuzIvwCjuP2IQv2zalXkBRnFfmoPJHlA5GwSUxj2XgqcnILVgidy8gNK4vwrBwjvL5ADVC9FasGEz+O+Ay6ON5x7BpxtlZuZ2YHZUPz4YgU0d1b/Z4gdfAHYEDZfNCXgZgsTMytjVAMcmoKGl3Hb5Fyx+BbkO8tmKLs0JyP6BZ91aX0DTNjj6AIRLb3vgKuw5D9PX4GcMcsbV0XwdSHzWdqIYvgC0DxqTT12A531aM4C1JJwdha1+/aloH4T5N9DSoScHSM1XdGX9X1CaD0LCkTGQEt5eXCFfBdYFGOWDxwvbj8PHKzW7Wdt9wCgfNrbBoWjNLoSKolY3+3+QQNJB/qREMeUYvWJGIigv0HZBcE97Gw4z5sAD5T1e9mmnIMNpYNxW8jxdopuM7qKvhgkiOAfsBZrrTLoETAP38TIiuskA/AXy+J+/IlLqSAAAAABJRU5ErkJggg==',
  'base64'
);
const APPLE_TOUCH_ICON = Buffer.from(
  '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',
  'base64'
);
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#FF9900"/>
  <!-- Letter K -->
  <path d="M 14 14 L 22 14 L 22 30 L 34 14 L 44 14 L 30 32 L 44 50 L 34 50 L 22 34 L 22 50 L 14 50 Z" fill="#FFFFFF"/>
  <!-- Upward trend arrow in bottom-right corner -->
  <path d="M 42 44 L 52 34 M 52 34 L 47 34 M 52 34 L 52 39" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`;

function sendJson(res, status, data) {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(data));
}

function sendBinary(res, status, buffer, contentType) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': contentType,
    'Content-Length': buffer.length,
    'Cache-Control': 'public, max-age=604800, immutable',
  });
  res.end(buffer);
}

function sendText(res, status, body, contentType) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=604800, immutable',
  });
  res.end(body);
}

function fetchKeepa(asins, domain) {
  return new Promise((resolve, reject) => {
    const keepaUrl = 'https://api.keepa.com/product?key=' + KEEPA_API_KEY +
      '&domain=' + domain + '&asin=' + asins + '&stats=30&buybox=1&rating=1';

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

  // Favicon endpoints
  if (path === '/favicon.ico') {
    sendBinary(res, 200, FAVICON_ICO, 'image/x-icon');
    return;
  }
  if (path === '/favicon.svg') {
    sendText(res, 200, FAVICON_SVG, 'image/svg+xml');
    return;
  }
  if (path === '/favicon-32.png' || path === '/favicon.png') {
    sendBinary(res, 200, FAVICON_PNG_32, 'image/png');
    return;
  }
  if (path === '/apple-touch-icon.png' || path === '/apple-touch-icon-precomposed.png') {
    sendBinary(res, 200, APPLE_TOUCH_ICON, 'image/png');
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
