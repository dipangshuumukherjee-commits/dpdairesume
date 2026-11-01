// Vercel Serverless Function: Secure Gemini API Gateway
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Support environment keys, custom client key header, or request body key
  const apiKey = process.env.GEMINI_API_KEY ||
                 process.env.GEMINI_KEY ||
                 process.env.GOOGLE_API_KEY ||
                 req.headers['x-gemini-key'] ||
                 req.body?.customApiKey;

  if (!apiKey) {
    return res.status(400).json({
      error: 'GEMINI_API_KEY environment variable is missing on server. Add GEMINI_API_KEY to your Vercel Project Environment Variables, or provide your Gemini API key in the website settings.',
      code: 'API_KEY_MISSING'
    });
  }

  const body = req.body;
  if (!body || !body.contents) {
    return res.status(400).json({ error: 'Missing prompt contents.' });
  }

  // Clean customApiKey so Google API does not reject with 400 Unknown field
  const cleanBody = { ...body };
  delete cleanBody.customApiKey;

  const bodyJson = JSON.stringify(cleanBody);
  if (bodyJson.length > 250000) {
    return res.status(413).json({ error: 'Prompt payload exceeds maximum allowed size.' });
  }

  // Robust candidate models in order of performance and availability
  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro'
  ];

  let lastError = null;
  let lastStatus = 500;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim()
        },
        body: bodyJson
      });

      const data = await geminiRes.json();

      if (geminiRes.ok) {
        return res.status(200).json(data);
      }

      lastStatus = geminiRes.status;
      lastError = data?.error?.message || JSON.stringify(data);
      console.warn(`Gemini model ${model} failed with status ${geminiRes.status}:`, lastError);

      // If invalid API key (400 or 403), stop retrying other models
      if (geminiRes.status === 400 && lastError.toLowerCase().includes('api key')) {
        return res.status(400).json({
          error: 'Invalid Google Gemini API Key provided. Please verify your API key in Google AI Studio.',
          details: lastError
        });
      }
    } catch (err) {
      lastError = err.message || String(err);
      console.error(`Gemini fetch error on model ${model}:`, err);
    }
  }

  return res.status(lastStatus || 500).json({
    error: 'All Gemini API endpoints failed.',
    details: lastError
  });
}
