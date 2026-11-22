/* ==========================================================================
   THE VOID ANIME // Cloudflare Edge Worker (Powered by Llama 3.1)
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Handle Translation API
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const rawText = (body.text || '').trim();

        if (!rawText) {
          return new Response(JSON.stringify({ translatedText: '' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Use Meta Llama 3.1-8B Instruct on Cloudflare GPUs
        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'You are an expert manga and manhwa translator. Translate the given dialogue directly into natural, punchy English suitable for a comic speech bubble. Output ONLY the translated English text, with no explanations, no notes, and no quotation marks.'
            },
            {
              role: 'user',
              content: `Translate this text to English: ${rawText}`
            }
          ]
        });

        const translated = (aiResponse.response || rawText).trim();

        return new Response(JSON.stringify({
          translatedText: translated.replace(/^["']|["']$/g, '') // Strip stray quotes
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Otherwise serve the frontend files from /public
    return env.ASSETS.fetch(request);
  }
};
