require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("node:path");

const { AiService } = require(path.join(__dirname, "services", "aiService"));

const app = express();
const ai = new AiService();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const BACKEND_CLIENT_KEY = process.env.BACKEND_CLIENT_KEY || "";

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

function requireClientKey(req, res, next) {
  const token = getBearerToken(req);

  if (!BACKEND_CLIENT_KEY || token !== BACKEND_CLIENT_KEY) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  next();
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "AxionAI Web API",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.post("/api/chat", requireClientKey, async (req, res) => {
  try {
    const { message, conversationId, userId, customSystemPrompt } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Mensagem inválida."
      });
    }

    const reply = await ai.askWeb(
      conversationId || "default",
      userId || "web-user",
      message.trim(),
      customSystemPrompt || ""
    );

    return res.json({
      ok: true,
      reply,
      conversationId: conversationId || "default"
    });
  } catch (error) {
    console.error("Erro no /api/chat:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Erro interno."
    });
  }
});

app.listen(PORT, () => {
  console.log(`AxionAI Web API rodando na porta ${PORT}`);
});
