import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { query, apiKey } = JSON.parse(event.body || "{}");
    if (!query) {
      return { statusCode: 400, body: JSON.stringify({ error: "Query is required" }) };
    }

    const keyToUse = (apiKey && apiKey.length > 0) ? apiKey : process.env.SERPAPI_KEY;
    const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${keyToUse}`);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Search API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Search failed" }),
    };
  }
};
