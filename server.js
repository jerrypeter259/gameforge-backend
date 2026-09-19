const http = require("http");

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const SYSTEM_PROMPT = `
You are GameForge AI, a friendly AI game-development assistant.

Help creators design original games, mechanics, characters, environments,
mobile controls, and Android optimization.

When asked for a game, give useful game-development information.
Do not claim that a game has been implemented unless the application
actually implemented it.

Prefer original designs instead of copying protected characters, assets,
levels, or branding from existing games.
`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}

async function askAI(message) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM_PROMPT,
        input: message,
        max_output_tokens: 1500
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "OpenAI API request failed."
    );
  }

  return data.output_text || "";
}

const server = http.createServer(async (req, res) => {

  if (req.method === "OPTIONS") {
    return sendJSON(res, 200, { ok: true });
  }

  if (req.method === "GET" && req.url === "/health") {
    return sendJSON(res, 200, {
      ok: true,
      service: "GameForge AI",
      model: MODEL
    });
  }

  if (req.method === "POST" && req.url === "/chat") {

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();

      if (body.length > 20000) {
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const request = JSON.parse(body);
        const message = String(request.message || "").trim();

        if (!message) {
          return sendJSON(res, 400, {
            error: "Message is empty."
          });
        }

        const reply = await askAI(message);

        return sendJSON(res, 200, { reply });

      } catch (error) {
        console.error(error);

        return sendJSON(res, 500, {
          error: error.message
        });
      }
    });

    return;
  }

  sendJSON(res, 404, {
    error: "Not found"
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GameForge backend running on port ${PORT}`);
});
