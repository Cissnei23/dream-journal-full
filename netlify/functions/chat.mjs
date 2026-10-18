// Streaming Chat Proxy for OpenRouter
export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'API key not configured. Set OPENROUTER_API_KEY in Netlify environment variables.' },
      { status: 500 }
    );
  }

  try {
    const { messages, model } = await req.json();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dream-journal.netlify.app',
        'X-Title': 'Dream Journal Chat'
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-4o',
        messages,
        stream: true,
        max_tokens: 2000,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      return Response.json({ error: await response.text() }, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

