/**
 * =========================================================================
 * Cloudflare Worker: Catbox.moe CORS Proxy
 * =========================================================================
 * 
 * Miễn phí 100,000 requests/ngày trên Cloudflare Workers Free Tier.
 * Cho phép tải tệp trực tiếp từ trình duyệt lên Catbox.moe mà không bị chặn CORS,
 * đồng thời vượt qua giới hạn 4.5MB của Vercel Serverless Function (hỗ trợ tới 100MB).
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    };

    // Xử lý preflight CORS OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "Catbox CORS Proxy",
          note: "Gửi POST multipart/form-data để tải tệp lên Catbox.moe",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    try {
      // Chuyển tiếp toàn bộ request payload (FormData) sang Catbox.moe
      const catboxRes = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        headers: request.headers,
        body: request.body,
      });

      const responseText = await catboxRes.text();

      return new Response(responseText, {
        status: catboxRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (err) {
      return new Response("Catbox Proxy Error: " + err.message, {
        status: 502,
        headers: corsHeaders,
      });
    }
  },
};
