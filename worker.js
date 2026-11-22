/* ==========================================================================
   THE VOID ANIME // Pure Manga Translation & Page Summary Engine
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ----------------------------------------------------------------------
    // 1. Direct Manga Page Story Summary
    // ----------------------------------------------------------------------
    if (url.pathname === '/api/summarize' && request.method === 'POST') {
      try {
        const body = await request.json();
        const text = (body.text || '').trim();

        const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            {
              role: 'system',
              content: `You are an expert manga and manhwa reader. 
Analyze the dialogue and text extracted from this specific manga page and provide a clean, direct STORY SUMMARY:
- What is happening in this specific scene?
- Who is speaking and what are they talking about?
- The key takeaway or revelation in this panel.
RULES: 
- Never complain about missing dialogue.
- Never ask the user for more information.
- Always provide a direct, confident explanation of the scene based on whatever text or characters are detected.`
            },
            {
              role: 'user',
              content: `Here is the text extracted from this manga page: "${text || 'Characters talking in a manga scene'}". Summarize what is happening in this scene:`
            }
          ]
        });

        return new Response(JSON.stringify({
          summary: response.response || 'Could not generate summary.'
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
              content: 'You are an expert manga translator. Translate the provided Japanese/Korean dialogue directly into clean, natural English for a comic speech bubble. Output ONLY the English translation, no notes, no quotes.'
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
