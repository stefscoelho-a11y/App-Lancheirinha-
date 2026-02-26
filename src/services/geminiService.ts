import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DailyRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  benefits: string[];
  quickTip: string;
}

export async function generateDailyRecipe(): Promise<DailyRecipe | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere uma receita de lanchinho saudável para crianças hoje. Use frutas, sem açúcar adicionado. Seja objetivo e use formato de lista.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Nome da receita (Receita)" },
            description: { type: Type.STRING, description: "O que é o lanche" },
            ingredients: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de ingredientes"
            },
            instructions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Passo a passo em lista (Modo de preparo)" 
            },
            benefits: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de benefícios nutricionais" 
            },
            quickTip: { type: Type.STRING, description: "Dica rápida de montagem" },
          },
          required: ["title", "description", "ingredients", "instructions", "benefits", "quickTip"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Error generating daily recipe:", error);
    return null;
  }
}
