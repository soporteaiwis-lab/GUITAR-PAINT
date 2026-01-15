import { GoogleGenAI, Type, Chat } from "@google/genai";
import { GuitarSpecs, AnalysisResult, GenerationResult } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes the uploaded guitar image to extract current specs and identify the model type.
 * Uses gemini-3-flash-preview for fast multimodal analysis with JSON output.
 */
export const analyzeGuitarImage = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  
  const prompt = `
    Act as an expert Luthier.
    Analiza la imagen adjunta bajo la matriz técnica de estándares industriales. Identifica:
    1. Tipo de cuerpo y posible madera base (basado en la veta/color).
    2. Configuración de pastillas (Single-coil, Humbucker, P-90).
    3. Tipo de puente y construcción del mástil (Bolt-on vs Set-neck).
    4. Dime qué 'Filosofía' sigue esta guitarra: ¿Modular (Fender), Artesanal (Gibson) o Alto Rendimiento (Ibanez/Superstrat)?
    
    Return a JSON object with the following structure:
    {
      "detectedSpecs": {
        "bodyWood": "Probable wood (e.g. Mahogany, Ash, Alder)",
        "bridge": "Bridge type",
        "pickups": "Pickup config",
        "fretboard": "Fretboard material",
        "construction": "Bolt-on or Set-neck",
        "philosophy": "Modular (Fender), Artesanal (Gibson) or Alto Rendimiento"
      },
      "luthierNotes": "A brief technical analysis (max 2 sentences) describing the guitar's likely tonal characteristics based on visual evidence."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSpecs: {
              type: Type.OBJECT,
              properties: {
                bodyWood: { type: Type.STRING },
                bridge: { type: Type.STRING },
                pickups: { type: Type.STRING },
                fretboard: { type: Type.STRING },
                construction: { type: Type.STRING },
                philosophy: { type: Type.STRING }
              }
            },
            luthierNotes: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis received");
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Generates a highly detailed, technical prompt for image generation based on lutherie logic.
 * Uses gemini-3-pro-preview for reasoning.
 */
export const generateLutheriePrompt = async (
  base64Original: string,
  targetSpecs: GuitarSpecs,
  originalPhilosophy: string = "Standard Industry Design"
): Promise<string> => {
  const ai = getAiClient();

  const notes = targetSpecs.notes || "";
  const isFrankenstein = notes.toLowerCase().includes("frankenstein") || notes.toLowerCase().includes("relic") || notes.toLowerCase().includes("hybrid");
  
  // Dynamic instruction based on mode
  const philosophyInstruction = isFrankenstein 
    ? "Create a 'High Performance Hybrid' aesthetic. Act as a Custom Shop Luthier blending the original shape with aggressive, modern, or distressed (relic) modifications. Deviate from the original vintage philosophy to achieve a unique 'Frankenstein' super-mod look."
    : `Ensure the aesthetic respects the original instrument's philosophy (${originalPhilosophy}) unless the modification explicitly contradicts it.`;

  const systemInstruction = `
    Act as an expert Digital Luthier and Product Architect. 
    Your goal is to write a highly technical, photorealistic image generation prompt based on requested modifications to a guitar.
    You must output ONLY the prompt text in English.
  `;

  const userPrompt = `
    Context: The user wants to modify the guitar shown in the attached image.
    
    Original Instrument Philosophy: ${originalPhilosophy}
    
    Requested Modifications (Target Specs):
    - Body Material: ${targetSpecs.bodyWood}
    - Fretboard: ${targetSpecs.fretboard}
    - Bridge System: ${targetSpecs.bridge}
    - Pickup Config: ${targetSpecs.pickups}
    - Neck Profile: ${targetSpecs.neckProfile}
    - Additional Notes: ${notes}

    Action: Generate an ultra-detailed technical visual description to be used as an image generation prompt (e.g. for Stable Diffusion or Imagen).
    
    Mandatory Requirements:
    1. LIGHTING & ANGLE: Maintain the ORIGINAL lighting, angle, and perspective of the reference image exactly.
    2. MATERIAL PHYSICS: Describe the specific wood grain and finish based on lutherie taxonomy (e.g., if Mahogany -> "porous reddish-brown grain with nitrocellulose fill"; if Ash -> "deep open pore grain").
    3. MECHANICS: 
       - If Evertune is selected, describe it as "modern chrome Evertune bridge system with individual saddle modules and spring tensioners".
       - If Floyd Rose, describe "double-locking tremolo system with fine tuners and locking nut".
    4. PHILOSOPHY: ${philosophyInstruction}
    
    Output Format: 
    A single paragraph English prompt starting with "A photorealistic 8k close-up shot of a modified electric guitar...". 
    Focus heavily on textures (wood pores, metal sheen, plastic aging).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          // We provide the image for context
          { inlineData: { mimeType: 'image/jpeg', data: base64Original } },
          { text: userPrompt }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });

    return response.text || "Failed to generate prompt.";
  } catch (error) {
    console.error("Prompt generation failed:", error);
    throw error;
  }
};

/**
 * Generates the actual modified image using the technical prompt.
 * Uses gemini-3-pro-image-preview.
 */
export const generateModifiedGuitarImage = async (technicalPrompt: string): Promise<string> => {
  const ai = getAiClient();

  try {
    // Note: We are generating a NEW image based on the prompt. 
    // We rely on the prompt being descriptive enough of the "concept" derived from the original.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: technicalPrompt }
        ]
      },
      config: {
        // High quality setting for product visualization
        imageConfig: {
            imageSize: '1K',
            aspectRatio: '1:1'
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No image generated");

    // Look for the inlineData part which contains the image
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Image data not found in response");

  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Creates a chat session for Luthier Advisory.
 * Uses gemini-3-flash-preview for fast, knowledgeable responses.
 */
export const createLuthierChatSession = (): Chat => {
  const ai = getAiClient();
  
  const systemInstruction = `
    You are an Expert Luthier and Guitar Technician.
    Your role is to advise users on guitar specifications, tonewoods, and mechanics.
    
    KNOWLEDGE BASE (STRICT ADHERENCE):
    
    1. TONEWOODS (Material Taxonomy):
       - Mahogany: Warm, low-mid focus, high density.
       - Ash (Fresno): Bright, scooped mids, 'Twang', lightweight.
       - Alder (Aliso): Balanced, the industry standard neutral.
       - Maple (Arce): EXTREME ATTACK, definition in transients, snap.
       - Ebony: Immediate response, glass-like reflection.
       
    2. GEOMETRY (Neck Profiles):
       - 50s Vintage (U/Baseball Bat): Thick mass, maximizes mechanical coupling and sustain. Ideal for vintage feel.
       - Modern C: Standard ergonomic.
       - Slim Taper: Fast, low mass.
       
    3. SCALES:
       - 25.5": High tension, snap (Fender style).
       - 24.75": Lower tension, easier bends, warmer (Gibson style).

    BEHAVIOR:
    - Answer questions directly and concisely.
    - If a user asks for "Attack" or "Definition", ALWAYS recommend MAPLE (Arce).
    - If a user asks for "Vintage" feel, recommend 50s profiles.
    - Use technical terminology (transients, coupling, frequency response).
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.5 // Keep it relatively factual and consistent
    }
  });
};