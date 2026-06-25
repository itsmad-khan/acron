/* ============================================================
   api/quiz.js — Serverless function that proxies quiz-generation
   requests to the AI model, with proper error handling.
   ============================================================ */

   const AI_ENDPOINT   = 'https://models.inference.ai.azure.com/chat/completions';
   const AI_MODEL       = 'gpt-4o-mini';
   const REQUEST_TIMEOUT_MS = 25_000; // Vercel's default function timeout is ~10-30s depending on plan
   const MAX_RETRIES    = 2;
   
   /* ─────────────────────────────────────────
      Fetch with timeout
      Prevents this function from hanging indefinitely if the
      AI provider's endpoint stalls, which would otherwise burn
      serverless execution time/cost with no result.
   ───────────────────────────────────────── */
   async function fetchWithTimeout(url, options, timeoutMs) {
     const controller = new AbortController();
     const timer = setTimeout(() => controller.abort(), timeoutMs);
   
     try {
       return await fetch(url, { ...options, signal: controller.signal });
     } finally {
       clearTimeout(timer);
     }
   }
   
   /* ─────────────────────────────────────────
      Call the AI with retry on transient failures
      (rate limits, 5xx server errors). Does NOT retry on
      4xx client errors other than 429, since retrying a bad
      request just wastes time and quota.
   ───────────────────────────────────────── */
   async function callAIWithRetry(prompt, attempt = 1) {
     let response;
   
     try {
       response = await fetchWithTimeout(
         AI_ENDPOINT,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': 'Bearer ' + process.env.ACRON_API_KEY,
           },
           body: JSON.stringify({
             model: AI_MODEL,
             messages: [
               {
                 role: 'system',
                 content: 'You are a helpful quiz maker for Pakistani students. Always return valid JSON only — no markdown, no explanation text outside the JSON.',
               },
               {
                 role: 'user',
                 content: prompt,
               },
             ],
             max_tokens: 8000,
             temperature: 0.7,
           }),
         },
         REQUEST_TIMEOUT_MS
       );
     } catch (err) {
       // Network failure or timeout (AbortError)
       if (attempt < MAX_RETRIES) {
         await new Promise(r => setTimeout(r, 500 * attempt));
         return callAIWithRetry(prompt, attempt + 1);
       }
       throw new Error(
         err.name === 'AbortError'
           ? 'AI request timed out. Please try again.'
           : 'Could not reach the AI service. Please check your connection and try again.'
       );
     }
   
     // Retry on rate limit (429) or server errors (5xx) — these are
     // transient and often succeed on a second attempt.
     if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
       await new Promise(r => setTimeout(r, 700 * attempt));
       return callAIWithRetry(prompt, attempt + 1);
     }
   
     return response;
   }
   
   /* ─────────────────────────────────────────
      Handler
   ───────────────────────────────────────── */
   export default async function handler(req, res) {
     res.setHeader('Access-Control-Allow-Origin', '*');
     res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
   
     if (req.method === 'OPTIONS') {
       res.status(200).end();
       return;
     }
   
     if (req.method !== 'POST') {
       res.status(405).json({ error: 'Method not allowed. Use POST.' });
       return;
     }
   
     const { prompt } = req.body ?? {};
   
     if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
       res.status(400).json({ error: 'No prompt provided.' });
       return;
     }
   
     // Basic guard against accidentally oversized requests
     // (e.g. if a frontend bug forgets to truncate extracted text).
     if (prompt.length > 30_000) {
       res.status(400).json({ error: 'Prompt is too long. Please select fewer pages or a shorter passage.' });
       return;
     }
   
     if (!process.env.ACRON_API_KEY) {
       console.error('[api/quiz] ACRON_API_KEY is not set in environment variables.');
       res.status(500).json({ error: 'Server is misconfigured. Please contact support.' });
       return;
     }
   
     try {
       const aiResponse = await callAIWithRetry(prompt);
   
       if (!aiResponse.ok) {
         const errorBody = await aiResponse.text().catch(() => aiResponse.statusText);
         console.error(`[api/quiz] AI provider error (${aiResponse.status}):`, errorBody);
   
         const friendlyMsg =
           aiResponse.status === 429 ? 'The AI service is busy right now. Please try again in a moment.' :
           aiResponse.status === 401 || aiResponse.status === 403 ? 'AI service authentication failed. Please contact support.' :
           'The AI service returned an error. Please try again.';
   
         res.status(502).json({ error: friendlyMsg });
         return;
       }
   
       const data = await aiResponse.json();
   
       // Validate the shape of the response before passing it back —
       // protects the frontend from crashing on an unexpected payload.
       if (!data?.choices?.[0]?.message?.content) {
         console.error('[api/quiz] Unexpected AI response shape:', JSON.stringify(data).slice(0, 500));
         res.status(502).json({ error: 'AI returned an unexpected response. Please try again.' });
         return;
       }
   
       res.status(200).json(data);
   
     } catch (err) {
       console.error('[api/quiz] Unhandled error:', err.message);
       res.status(500).json({ error: err.message || 'Something went wrong generating the quiz. Please try again.' });
     }
   }