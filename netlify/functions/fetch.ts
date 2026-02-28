import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { url } = JSON.parse(event.body || "{}");
    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: "URL is required" }) };
    }

    const response = await fetch(url);
    const text = await response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ content: text }),
    };
  } catch (error) {
    console.error("URL Fetch Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch URL" }),
    };
  }
};
