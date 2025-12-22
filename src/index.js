import OpenAI from "openai";

/**
 * Cloudflare Worker that accepts chat messages
 * and proxies them to OpenAI’s ChatGPT API.
 */
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      // Allow CORS so you can call this from browser
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method === "POST" && new URL(request.url).pathname === "/chat") {
      try {
        const body = await request.json();
        const userMessage = body.message;

        // Validate input
        if (!userMessage) {
          return Response.json({ error: "Message is required" }, { status: 400 });
        }

        // Create OpenAI client with the secret you set in Cloudflare
        const openai = new OpenAI({
          apiKey: env.OPENAI_API_KEY, // secret stored with wrangler
        });

        // Call OpenAI’s chat completions
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",       // Choose whichever model you want
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage },
          ],
          max_tokens: 150,
        });

        // Extract the text reply
        const reply = response.choices?.[0]?.message?.content || "";

        return Response.json({ reply }, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });

      } catch (err) {
        console.error(err);
        return Response.json({ error: String(err) }, { status: 500 });
      }
    }

    return new Response("AI Chatbot Worker — POST to /chat", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  },
};
