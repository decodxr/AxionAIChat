require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("node:path");

const { AiService } = require(path.join(__dirname, "services", "aiService"));

const app = express();
const ai = new AiService();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: "*/*", limit: "2mb" }));

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

function pickMessage(body) {
  if (!body) return "";

  if (typeof body === "string") return body.trim();

  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  if (typeof body.prompt === "string" && body.prompt.trim()) return body.prompt.trim();
  if (typeof body.content === "string" && body.content.trim()) return body.content.trim();
  if (typeof body.input === "string" && body.input.trim()) return body.input.trim();
  if (typeof body.text === "string" && body.text.trim()) return body.text.trim();
  if (typeof body.query === "string" && body.query.trim()) return body.query.trim();

  if (Array.isArray(body.messages) && body.messages.length) {
    const last = body.messages[body.messages.length - 1];

    if (typeof last === "string" && last.trim()) return last.trim();
    if (last && typeof last.content === "string" && last.content.trim()) return last.content.trim();
    if (last && Array.isArray(last.content)) {
      const textPart = last.content.find((p) => typeof p?.text === "string" && p.text.trim());
      if (textPart) return textPart.text.trim();
    }
  }

  if (body.data && typeof body.data === "object") {
    return pickMessage(body.data);
  }

  return "";
}

function pickConversationId(body) {
  if (!body || typeof body === "string") return "default";
  return (
    body.conversationId ||
    body.chatId ||
    body.conversation_id ||
    body.threadId ||
    body.sessionId ||
    "default"
  );
}

function pickUserId(body) {
  if (!body || typeof body === "string") return "web-user";
  return body.userId || body.user_id || body.memberId || "web-user";
}

function pickCustomSystemPrompt(body) {
  if (!body || typeof body === "string") return "";
  return body.customSystemPrompt || body.systemPrompt || "";
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
    const body = req.body || {};
    const rawMessage = pickMessage(body);
    const conversationId = pickConversationId(body);
    const userId = pickUserId(body);
    const customSystemPrompt = pickCustomSystemPrompt(body);

    console.log("Body recebido:", typeof body === "string" ? body : JSON.stringify(body));

    if (!rawMessage) {
      return res.status(400).json({
        ok: false,
        error: "Mensagem inválida.",
        receivedType: typeof body
      });
    }

    const reply = await ai.askWeb(
      conversationId,
      userId,
      rawMessage,
      customSystemPrompt
    );

    return res.json({
      ok: true,
      reply,
      conversationId
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
