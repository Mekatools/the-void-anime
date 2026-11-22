/* ==========================================================================
   THE VOID ANIME // Cloudflare Workers AI Translation Endpoint
   Model: @cf/meta/m2m100-1.2b (Multilingual: Japanese / Korean / Chinese -> English)
   Zero storage: Processed purely in GPU memory, never logged.
   ========================================================================== */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Set up standard JSON response headers
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const body = await request.json();
    const rawText = (body.text || '').trim();
    const sourceLangCode = body.sourceLang || 'jpn';

    // If no text was sent, return empty immediately
    if (!rawText) {
      return new Response(JSON.stringify({ translatedText: '' }), { headers: jsonHeaders });
    }

    // Map our app's language codes to Cloudflare's model language names
    const languageMap = {
      jpn: 'japanese',
      kor: 'korean',
      chi_sim: 'chinese'
    };

    const sourceLangName = languageMap[sourceLangCode] || 'japanese';

    // Verify Cloudflare Workers AI is bound
    if (!env.AI) {
      // Graceful fallback if Workers AI binding isn't clicked yet in dashboard
      return new Response(JSON.stringify({ 
        translatedText: rawText,
        warning: 'AI binding not yet configured in Cloudflare dashboard' 
      }), { headers: jsonHeaders });
    }

    // Run Meta M2M100 multilingual translation on Cloudflare GPUs
    const aiResponse = await env.AI.run('@cf/meta/m2m100-1.2b', {
      text: rawText,
      source_lang: sourceLangName,
      target_lang: 'english'
    });

    const translated = aiResponse.translated_text || rawText;

    return new Response(JSON.stringify({
      translatedText: translated.trim()
    }), {
      status: 200,
      headers: jsonHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'Translation failed'
    }), {
      status: 500,
      headers: jsonHeaders
    });
  }
}
