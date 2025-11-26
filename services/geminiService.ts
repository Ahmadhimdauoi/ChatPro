import { MessageRole, ChatMessage } from '../types';

// Types for Gemini API
interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

interface Part {
  text: string;
}

// Mock model for now (replace with actual Gemini SDK when available)
const model = {
  generateContent: async (historyForAi: Content[]) => {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + import.meta.env.VITE_API_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: historyForAi,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      });
      
      const data = await response.json();
      return {
        response: {
          text: () => data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate summary."
        }
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        response: {
          text: () => "Failed to connect to AI service."
        }
      };
    }
  }
};

/**
 * Creates a new instance of the GoogleGenAI client.
 * This should be called right before making an API call to ensure the latest API key is used.
 */
const getGeminiClient = () => {
  if (!import.meta.env.VITE_API_KEY) {
    console.error('VITE_API_KEY is not defined. AI features may not work.');
  }
  // Simple fetch-based implementation for now
  return {
    chats: {
      create: (options: any) => ({
        sendMessage: async (message: any) => {
          const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + import.meta.env.VITE_API_KEY, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: message.message }]
                }
              ],
              systemInstruction: options.config?.systemInstruction ? {
                role: "user",
                parts: [{ text: options.config.systemInstruction }]
              } : undefined,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            })
          });
          
          const data = await response.json();
          return {
            text: data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response."
          };
        }
      })
    }
  };
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
      model: 'gemini-1.5-flash',
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