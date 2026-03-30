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

    try {
      const url = new URL(request.url);

      // Only allow POST requests for the proxy endpoints, unless it's a tool endpoint
      if (request.method !== 'POST' && !url.pathname.startsWith('/api/tools')) {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }

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
      } else if (url.pathname.startsWith('/api/tools/weather')) {
        const location = url.searchParams.get('location');
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');
        
        let latitude, longitude, locName;

        if (location) {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) {
                return new Response(JSON.stringify({error: "Location not found"}), {status:404, headers: corsHeaders});
            }
            latitude = geoData.results[0].latitude;
            longitude = geoData.results[0].longitude;
            locName = `${geoData.results[0].name}${geoData.results[0].admin1 ? ', ' + geoData.results[0].admin1 : ''}, ${geoData.results[0].country}`;
        } else if (lat && lon) {
            latitude = lat;
            longitude = lon;
            locName = "Device Location";
        } else {
            return new Response(JSON.stringify({error: "Location or lat/lon required"}), {status:400, headers: corsHeaders});
        }
        
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`);
        const weatherData = await weatherRes.json();
        
        return new Response(JSON.stringify({
            location: locName,
            current: weatherData.current
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname.startsWith('/api/tools/wikipedia')) {
        const topic = url.searchParams.get('topic');
        if (!topic) return new Response(JSON.stringify({error: "Topic required"}), {status:400, headers: corsHeaders});
        
        // 1. Search for best match
        const wikiHeaders = { 'User-Agent': 'JarvisAI/1.0 (https://github.com/veerbajaj; jarvis@example.com)' };
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json`, { headers: wikiHeaders });
        
        let searchData;
        try {
            searchData = await searchRes.json();
        } catch(e) {
            return new Response(JSON.stringify({error: "Wikipedia API blocked or returned invalid JSON"}), {status: 502, headers: corsHeaders});
        }
        
        if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
            return new Response(JSON.stringify({error: "Topic not found"}), {status:404, headers: corsHeaders});
        }
        const bestMatchTitle = searchData.query.search[0].title;
        
        // 2. Fetch summary
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatchTitle)}`, { headers: wikiHeaders });
        if (!wikiRes.ok) return new Response(JSON.stringify({error: "Summary not found"}), {status:404, headers: corsHeaders});
        const wikiData = await wikiRes.json();
        
        return new Response(JSON.stringify({
            title: wikiData.title,
            extract: wikiData.extract,
            thumbnail: wikiData.thumbnail?.source || null
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (url.pathname.startsWith('/api/tools/investing')) {
        const ticker = url.searchParams.get('ticker') || 'AAPL';
        
        const financeRes = await fetch(`https://www.google.com/finance/quote/${ticker}:NASDAQ`);
        let financeText = await financeRes.text();
        
        let price = "Unknown";
        const priceMatch = financeText.match(/class="YMlKec fxKbKc"[^>]*>([^<]+)<\/div>/);
        if (priceMatch && priceMatch[1]) {
            price = priceMatch[1];
        } else {
            const financeResNYSE = await fetch(`https://www.google.com/finance/quote/${ticker}:NYSE`);
            financeText = await financeResNYSE.text();
            const priceMatchNYSE = financeText.match(/class="YMlKec fxKbKc"[^>]*>([^<]+)<\/div>/);
            if (priceMatchNYSE && priceMatchNYSE[1]) price = priceMatchNYSE[1];
        }
        
        let news = [];
        try {
            const rssRes1 = await fetch(`https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en&oc=11`);
            const rssText1 = await rssRes1.text();
            const itemRegex = /<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/g;
            let match;
            let count = 0;
            while ((match = itemRegex.exec(rssText1)) !== null && count < 3) {
                const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                news.push({ title, link: match[2] });
                count++;
            }

            const rssRes2 = await fetch(`https://feeds-api.dotdashmeredith.com/v1/rss/google/f6a0e92b-be8d-4abb-9106-703b04059e19`);
            const rssText2 = await rssRes2.text();
            count = 0;
            while ((match = itemRegex.exec(rssText2)) !== null && count < 2) {
                const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                news.push({ title, link: match[2] });
                count++;
            }
        } catch (e) {}
        
        return new Response(JSON.stringify({
            ticker,
            price,
            news
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
