import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch (e) {
    // In case process is not defined and vite define failed
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
      let text = response.text.trim();
      
      // Remove markdown code blocks if the model included them
      if (text.includes('```')) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", text);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating daily recipe:", error);
    return null;
  }
}
