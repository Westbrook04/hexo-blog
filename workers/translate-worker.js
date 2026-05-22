// Cloudflare Worker: Translation proxy
// Proxies batch translation requests to Google Translate API.
// Frontend sends array of text strings → Worker returns array of translations.
//
// Deploy:
//   npx wrangler deploy workers/translate-worker.js --name hexo-translate
// Or via Cloudflare Dashboard: create a Worker and paste this file.

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }

    const { texts, source, target } = body;
    if (!Array.isArray(texts) || texts.length === 0) {
      return jsonResponse({ error: 'Missing texts array' }, 400);
    }

    const params = new URLSearchParams();
    params.set('client', 'gtx');
    params.set('sl', source || 'en');
    params.set('tl', target || 'zh-CN');
    params.set('dt', 't');
    texts.forEach(t => params.append('q', t));

    const apiUrl = `https://translate.googleapis.com/translate_a/single?${params}`;

    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        return jsonResponse({ error: 'Upstream API error', detail: resp.statusText }, 502);
      }
      const data = await resp.json();
      return jsonResponse({ translated: data[0].map(item => item[0]) });
    } catch (err) {
      return jsonResponse({ error: err.message }, 502);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
