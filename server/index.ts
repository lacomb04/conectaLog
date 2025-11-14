import express, { Request, Response } from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.warn("[proxy] OPENAI_API_KEY não definida. Respostas retornarão 500.");
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.post("/api/conectabot", async (req: Request, res: Response) => {
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "Chave OpenAI ausente no backend." });
  }
  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await openaiResponse.json();
    res.status(openaiResponse.status).json(data);
  } catch (error: any) {
    console.error("[proxy] Erro ao contatar OpenAI:", error.message);
    res.status(500).json({ error: "Falha ao contatar OpenAI" });
  }
});

app.listen(PORT, () => {
  console.log(`[proxy] Servidor ConectaBot rodando na porta ${PORT}`);
});
