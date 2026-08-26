import openNextWorker from "./.open-next/worker.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // SEO: Redirect www to apex domain
    if (url.hostname === "www.zayron-x.co") {
      url.hostname = "zayron-x.co";
      return Response.redirect(url.toString(), 301);
    }
    
    // Proxy all /api/* requests directly to the API Worker via Service Binding
    if (url.pathname.startsWith("/api/")) {
      return env.API_WORKER.fetch(request);
    }
    return openNextWorker.fetch(request, env, ctx);
  }
};
