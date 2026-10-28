// Vercel Serverless Function — Gemini AI Proxy
// File location: api/gemini.js (at repo root)
// Set GEMINI_API_KEY in Vercel → Project → Settings → Environment Variables

// Vercel Serverless Function: Secure Gemini API Gateway
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on server.' });
  }

  const body = req.body;
  if (!body || !body.contents) {
    return res.status(400).json({ error: 'Missing prompt contents.' });
  }

  // Safety length validation (protect server memory and quotas)
  const bodyJson = JSON.stringify(body);
  if (bodyJson.length > 30000) {
    return res.status(413).json({ error: 'Prompt payload exceeds maximum allowed size.' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyJson
    });

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch (err) {
    console.error('Gemini gateway proxy error:', err);
    return res.status(500).json({ error: 'Internal gateway error communicating with Gemini API.' });
  }
}

        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Gemini API error' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
