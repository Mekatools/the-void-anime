/* ==========================================================================
   THE VOID ANIME // Translation & Shorts Script AI Engine
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ----------------------------------------------------------------------
    // 1. YouTube Shorts Script & Scene Summary Generator
    // ----------------------------------------------------------------------
    if (url.pathname === '/api/summarize' && request.method === 'POST') {
      try {
        const body = await request.json();
        const text = (body.text || '').trim();

        const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            {
              role: 'system',
              content: `You are an expert YouTube Shorts & TikTok anime explainer scriptwriter. 
Analyze the provided manga scene dialogue and generate an engaging, viral breakdown formatted with:
1. 🎬 SCENE BREAKDOWN (1-2 sentences explaining what is happening).
2. 🎙️ 30-SECOND SHORTS VOICEOVER SCRIPT (Catchy hook, conversational tone, easy to speak aloud).
3. 🏷️ VIRAL SHORTS TITLE & HASHTAGS.`
            },
            {
              role: 'user',
              content: `Here is the dialogue/context from this manga page: "${text || 'Manga scene analysis'}". Write the summary and Shorts voiceover script:`
            }
          ]
        });

        return new Response(JSON.stringify({
          script: response.response || 'Could not generate summary.'
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

    // ----------------------------------------------------------------------
    // 2. Speech Bubble Translation Engine
    // ----------------------------------------------------------------------
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const rawText = (body.text || '').trim();

        if (!rawText) {
          return new Response(JSON.stringify({ translatedText: '' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'You are an expert manga translator. Translate the provided Japanese/Korean dialogue directly into clean, natural English for a speech bubble. Output ONLY the English translation, no notes, no quotes.'
            },
            {
              role: 'user',
              content: rawText
            }
          ]
        });

        let english = (aiResponse.response || '').trim();
        english = english.replace(/^["']|["']$/g, '');

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
