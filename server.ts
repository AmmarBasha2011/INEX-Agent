import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for URL fetching
  app.post("/api/fetch", async (req, res) => {
    try {
      const { url } = req.body;
      const response = await fetch(url);
      const text = await response.text();
      res.json({ content: text });
    } catch (error) {
      console.error("URL Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch URL" });
    }
  });

  // Proxy for SerpAPI to avoid CORS issues on the frontend
  app.post("/api/search", async (req, res) => {
    try {
      const { query, apiKey } = req.body;
      const keyToUse = (apiKey && apiKey.length > 0) ? apiKey : "c477d856da8f9be3f08ebe14b7eddcb5ce0976318c660bca4b1133e2122b4190";
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${keyToUse}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Search API Error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Serve static files in production or use vite in dev
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
