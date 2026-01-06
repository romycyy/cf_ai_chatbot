export const onRequestPost: PagesFunction = async (context) => {
    const { request, env } = context;
  
    // Forward request to your Worker
    const workerUrl = "https://chatbot-dev.cyy20041234.workers.dev/chat";
  
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: request.headers,
      body: request.body,
    });
  
    // Forward the streaming response with CORS headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
      },
    });
  };
  