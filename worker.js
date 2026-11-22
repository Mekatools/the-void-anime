/* ==========================================================================
   THE VOID ANIME // Cloudflare Edge Worker & AI Translation
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Handle Translation API
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const rawText = (body.text || '').trim();
        const sourceLangCode = body.sourceLang || 'jpn';

        if (!rawText) {
          return new Response(JSON.stringify({ translatedText: '' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Must use official 2-letter ISO codes: 'ja', 'ko', 'zh', 'en'
        const langMap = {
          jpn: 'ja',
          kor: 'ko',
          chi_sim: 'zh'
        };

        const sourceLang = langMap[sourceLangCode] || 'ja';

        // Run Cloudflare Workers AI Multilingual Model with 2-letter codes
        const aiResponse = await env.AI.run('@cf/meta/m2m100-1.2b', {
          text: rawText,
          source_lang: sourceLang,
          target_lang: 'en'
        });

        const translated = aiResponse.translated_text || rawText;

        return new Response(JSON.stringify({
          translatedText: translated.trim()
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
