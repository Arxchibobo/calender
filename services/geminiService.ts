import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CalendarPageData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Schema for structured JSON generation
const calendarSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    page_id: { type: Type.STRING },
    date_gregorian: { type: Type.STRING },
    month: { type: Type.INTEGER },
    day: { type: Type.INTEGER },
    weekday_cn: { type: Type.STRING },
    lunar_cn: { type: Type.STRING },
    is_holiday: { type: Type.BOOLEAN },
    holiday_name_cn: { type: Type.STRING },
    festival_badge: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN },
        type: { type: Type.STRING },
        label_cn: { type: Type.STRING }
      }
    },
    author: {
      type: Type.OBJECT,
      properties: {
        name_cn: { type: Type.STRING },
        bio_cn: { type: Type.STRING },
        avatar_url: { type: Type.STRING },
        handle: { type: Type.STRING }
      }
    },
    content: {
      type: Type.OBJECT,
      properties: {
        quote_cn: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    branding: {
        type: Type.OBJECT,
        properties: {
            left_brand: { type: Type.STRING },
            right_brand: { type: Type.STRING }
        }
    }
  },
  required: ["month", "day", "weekday_cn", "lunar_cn", "author", "content"]
};

interface DateContext {
    year: number;
    month: number;
    day: number;
}

export const generateCalendarData = async (prompt: string, dateContext?: DateContext): Promise<Partial<CalendarPageData>> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  
  let dateInstruction = "If specific date is not mentioned, pick a random date in 2026.";
  if (dateContext) {
      dateInstruction = `Strictly use the date: ${dateContext.year}-${String(dateContext.month).padStart(2, '0')}-${String(dateContext.day).padStart(2, '0')}. Calculate the correct weekday and lunar date for this specific day.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a structured calendar page JSON for the following request: "${prompt}". 
    Ensure it fits the CalendarPageData structure. 
    ${dateInstruction}
    The content should be inspiring or relevant to the prompt and date.
    Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: calendarSchema,
      tools: [{googleSearch: {}}]
    }
  });

  if (response.text) {
    try {
      const data = JSON.parse(response.text);
      // Enforce the requested date if provided, just in case the LLM drifted
      if (dateContext) {
          data.month = dateContext.month;
          data.day = dateContext.day;
          data.date_gregorian = `${dateContext.year}-${String(dateContext.month).padStart(2, '0')}-${String(dateContext.day).padStart(2, '0')}`;
      }
      return data;
    } catch (e) {
      console.error("Failed to parse JSON", e);
      throw new Error("Failed to parse Gemini response");
    }
  }
  throw new Error("No response from Gemini");
};

export const generateImage = async (prompt: string, aspectRatio: string = "3:4"): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any, 
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  // Remove header if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png', // Assuming png or jpeg, API handles robustly usually
            data: base64Data
          }
        },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image returned");
};