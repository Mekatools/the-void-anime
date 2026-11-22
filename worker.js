/* ==========================================================================
   THE VOID ANIME // Manga Explainer & Translation Engine
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ----------------------------------------------------------------------
    // 1. Authentic Manga Explainer Recap Engine
    // ----------------------------------------------------------------------
    if (url.pathname === '/api/summarize' && request.method === 'POST') {
      try {
        const body = await request.json();
        const text = (body.text || '').trim();

        const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            {
              role: 'system',
              content: `You are a top anime and manga recap YouTuber (like an explainer channel).
Your job is to explain what is happening on this manga page in a natural, engaging, and hype storytelling tone.

BANNED PHRASES:
- Do NOT say "In this scene, a conversation is taking place..."
- Do NOT say "The dialogue appears to be fragmented..."
- Do NOT say "The key takeaway or revelation is..."
- Do NOT sound like an academic robot.

Write the explanation in this clean, punchy format:

🔥 WHAT'S ACTUALLY GOING DOWN:
(Explain the scene in 2-3 casual, exciting sentences: who is here, where they are, and what situation is happening.)

💬 WHAT THEY'RE TALKING ABOUT:
(Break down the conversation in plain, easy-to-understand English so viewers immediately get the joke or dialogue.)

💡 THE DETAILS & LORE:
(Explain the trivia, power, gag, or hidden detail behind the scene that viewers would find cool.)

Tone: Casual, confident, storytelling narrator.`
            },
            {
              role: 'user',
              content: `Explain this manga page to my viewers like a real manga YouTuber. Here is the text from the page: "${text || 'Manga characters discussing a scene'}"`
            }
          ]
        });

        return new Response(JSON.stringify({
          summary: response.response || 'Could not generate explanation.'
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
