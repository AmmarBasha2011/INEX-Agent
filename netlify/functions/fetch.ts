import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { url } = JSON.parse(event.body || "{}");
    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: "URL is required" }) };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
       return { statusCode: 400, body: JSON.stringify({ error: "Invalid protocol. Only http and https are supported." }) };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
       return { statusCode: response.status, body: JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }) };
    }

    const text = await response.text();

    // Limit response size to 512KB to keep it manageable for AI context
    const limitedText = text.slice(0, 512 * 1024);

    return {
      statusCode: 200,
      body: JSON.stringify({ content: limitedText }),
    };
  } catch (error: any) {
    console.error("URL Fetch Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.name === 'AbortError' ? "Request timed out" : "Failed to fetch URL" }),
    };
  }
};
