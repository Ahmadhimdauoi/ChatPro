import { GoogleGenAI, Content, Part } from "@google/genai";
import { MessageRole } from '../types';

/**
 * Creates a new instance of the GoogleGenAI client.
 * This should be called right before making an API call to ensure the latest API key is used.
 */
const getGeminiClient = () => {
  if (!process.env.API_KEY) {
    console.error('API_KEY is not defined. AI features may not work.');
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Sends a message to the Gemini API and returns the generated content.
 * @param prompt The user's prompt.
 * @param history Optional chat history for context.
 * @returns A promise that resolves to the generated text content.
 */
export const generateGeminiContent = async (
  prompt: string,
  history: { role: MessageRole; parts: { text: string }[] }[] = []
): Promise<string> => {
  try {
    const ai = getGeminiClient();

    // Map the application specific history format to the Gemini SDK Content format
    const chatHistory: Content[] = history.map(h => ({
      role: h.role === MessageRole.User ? 'user' : 'model',
      parts: h.parts as Part[],
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: chatHistory,
      config: {
        systemInstruction: "You are a helpful, professional AI assistant integrated into the ChatPro corporate messaging system. Keep responses concise, polite, and relevant to a workplace context.",
      }
    });

    const response = await chat.sendMessage({
      message: prompt,
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error generating Gemini content:', error);
    return "I am currently unable to connect to the AI service. Please try again later.";
  }
};