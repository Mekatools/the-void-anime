/* ==========================================================================
   THE VOID ANIME // Translation Worker (Cloudflare Workers AI)
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const rawText = (body.text || '').trim();

        if (!rawText) {
          return new Response(JSON.stringify({ translatedText: '' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Run Cloudflare Workers AI with explicit translation instructions
        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt: `Translate this comic dialogue directly to English. Output ONLY the English translation, no notes, no quotes, no explanations:\n\n${rawText}`
        });

        let english = (aiResponse.response || '').trim();
        english = english.replace(/^["']|["']$/g, ''); // strip quotes

        return new Response(JSON.stringify({
          translatedText: english
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

    return env.ASSETS.fetch(request);
  }
};
