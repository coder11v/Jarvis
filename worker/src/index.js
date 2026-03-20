export default {
  async fetch(request, env, ctx) {
    // Configure CORS headers to allow requests from any origin (or specify the domain)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests for the proxy endpoints
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);

      // We expose one unified endpoint: /api/generate
      // The client will send the target API URL and the payload.
      if (url.pathname === '/api/generate') {
        const body = await request.json();
        
        // Use the GEMINI_API_KEY from environment variables instead of hardcoding it in the client
        if (!env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY environment variable is missing.');
        }

        // Validate the requested target URL to ensure it points to Google's generative language API
        const targetUrl = new URL(body.url);
        if (targetUrl.hostname !== 'generativelanguage.googleapis.com') {
          throw new Error('Invalid target URL.');
        }
        
        // Append the secured API key
        targetUrl.searchParams.set('key', env.GEMINI_API_KEY);

        // Forward the request to Gemini API
        const response = await fetch(targetUrl.href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body.payload),
        });

        const data = await response.text();
        return new Response(data, { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }
};
