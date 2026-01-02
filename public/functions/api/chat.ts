export const onRequestPost: PagesFunction = async (context) => {
    const { request, env } = context;
  
    // Forward request to your Worker
    const workerUrl = "https://chatbot-dev.cyy20041234.workers.dev/chat";
  
    return fetch(workerUrl, {
      method: "POST",
      headers: request.headers,
      body: request.body,
    });
  };
  