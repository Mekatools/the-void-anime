/* ==========================================================================
   THE VOID ANIME // Active Llama 3.2 Multilingual Manga Translator
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

        // 1. Primary: Run Active Llama 3.2 Model on Cloudflare
        try {
          const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
            messages: [
              {
                role: 'system',
                content: 'You are an expert manga and comic translator. Translate the provided dialogue directly into natural, punchy English suitable for a comic speech bubble. Output ONLY the English translation, with no quotes and no explanations.'
              },
              {
                role: 'user',
                content: rawText
              }
            ]
          });

          let english = (aiResponse.response || '').trim();
          english = english.replace(/^["']|["']$/g, ''); // strip outer quotes

          if (english) {
            return new Response(JSON.stringify({ translatedText: english }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } catch (llamaErr) {
          console.warn('Llama 3.2 failed, falling back to m2m100:', llamaErr);
        }

        // 2. Automatic Fallback: Meta M2M100 Model
        const fallback = await env.AI.run('@cf/meta/m2m100-1.2b', {
          text: rawText,
          target_lang: 'en'
        });

        const fallbackEnglish = (fallback.translated_text || rawText).trim();

        return new Response(JSON.stringify({
          translatedText: fallbackEnglish
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
