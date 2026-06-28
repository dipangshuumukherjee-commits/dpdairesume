// Vercel Serverless Function — keeps Gemini API key server-side
// Deploy: this file goes in /api/gemini.js in your project root
// Set GEMINI_API_KEY in Vercel Dashboard → Project → Settings → Environment Variables

export default async function handler(req, res) {
  // CORS — only allow your own domain
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) { res.status(500).json({ error: 'API key not configured on server' }); return; }

  try {
    const body = req.body;
    if (!body || !body.contents) { res.status(400).json({ error: 'Invalid request body' }); return; }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    if (!response.ok) { res.status(response.status).json({ error: data?.error?.message || 'Gemini API error' }); return; }

    res.status(200).json(data);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
