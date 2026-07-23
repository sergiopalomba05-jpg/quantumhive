import { Router } from "express";
import { ai } from "../../core/providers/ai";
import { upload } from "../config/upload";

export const visionRouter = Router();

// 3. Analyze Video (gemini-2.5-pro)
visionRouter.post("/analyze-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No video file uploaded");
    const base64Data = req.file.buffer.toString("base64");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: {
        parts: [
          { text: "Analyze this video and describe the key events." },
          { inlineData: { data: base64Data, mimeType: req.file.mimetype } }
        ]
      }
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Video analyze error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Analyze Image (gemini-2.5-pro)
visionRouter.post("/analyze-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No image file uploaded");
    const base64Data = req.file.buffer.toString("base64");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: {
        parts: [
          { text: "Analyze this image and describe what you see." },
          { inlineData: { data: base64Data, mimeType: req.file.mimetype } }
        ]
      }
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Image analyze error:", error);
    res.status(500).json({ error: error.message });
  }
});
