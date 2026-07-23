import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ai } from "../../core/providers/ai";
import { supabase } from "../../core/providers/supabase";
import { ThinkingLevel } from "@google/genai";
import { resolveBrainSelection } from "../../core/brainRouter";
import { buildDominusContextPack, extractMemoryProposal } from "../../core/dominusContext";

export const chatRouter = Router();

// 1. Google Search Data (gemini-2.5-flash)
chatRouter.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const text = response.text;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    res.json({ text, chunks });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. High Thinking (gemini-2.5-pro)
chatRouter.post("/think", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: message,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    res.json({ text: response.text, parts });
  } catch (error: any) {
    console.error("Think error:", error);
    res.status(500).json({ error: error.message });
  }
});

chatRouter.post("/agents/:agentId/chat", async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, brainMode, modelId } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const { data: agent, error: agentError } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (agentError || !agent) {
      res.status(404).json({ error: "agent not found" });
      return;
    }

    const { data: memories, error: memoriesError } = await supabase
      .from("memories")
      .select("title,content,importance,type,tags")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (memoriesError) throw memoriesError;

    const systemCorePath = path.join(process.cwd(), agent.system_core_doc_path || "docs/DOMINUS_PRIME_SYSTEM_CORE.md");
    const constitutionPath = path.join(process.cwd(), agent.constitution_doc_path || "docs/DOMINUS_PRIME_CONSTITUTION.md");
    const [systemCore, constitution] = await Promise.all([
      readFile(systemCorePath, "utf8"),
      readFile(constitutionPath, "utf8"),
    ]);

    const brain = resolveBrainSelection({ brainMode, modelId, message });
    const context = buildDominusContextPack({
      agent: { name: agent.name, role: agent.role },
      systemCore,
      constitution,
      memories: memories || [],
      message,
    });

    const config = brain.usedModelId === "gemini-2.5-flash" ? { tools: [{ googleSearch: {} }] } : undefined;
    const response = await ai.models.generateContent({
      model: brain.usedModelId,
      contents: context.prompt,
      ...(config ? { config } : {}),
    });

    const extracted = extractMemoryProposal(response.text || "");
    res.json({ text: extracted.text, brain, memoryProposal: extracted.memoryProposal });
  } catch (error: any) {
    console.error("Dominus chat error:", error);
    res.status(500).json({ error: error.message });
  }
});
