import { GoogleGenAI } from "@google/genai";
import { Resolution, AspectRatio } from "../types";

// Helper to remove base64 header safely
const cleanBase64 = (base64: string) => {
  const commaIndex = base64.indexOf(',');
  return commaIndex !== -1 ? base64.substring(commaIndex + 1) : base64;
};

export const checkApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const openApiKeySelector = async () => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};

/**
 * Step 1: Analyze inputs using Gemini 3.0 Pro to create a master prompt based on the template.
 */
export const analyzeAndCreatePrompt = async (
  userImages: string[],
  sceneImages: string[],
  refImages: string[],
  userPrompt: string,
  baseTemplate: string,
  isGiantTemplate: boolean = false,
  apiKey: string = ''
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.VITE_API_KEY || '' });

  // If no inputs are provided, return the base template directly
  if (userImages.length === 0 && sceneImages.length === 0 && refImages.length === 0 && !userPrompt) {
    return baseTemplate;
  }

  const parts: any[] = [];

  // Add images with explicit context labels for analysis
  userImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
    parts.push({ text: "Input Image Type: [User Subject/Person]" });
  });

  sceneImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
    parts.push({ text: "Input Image Type: [User Scene/Background]" });
  });

  refImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
    parts.push({ text: "Input Image Type: [Style Reference]" });
  });

  // User instructions are always relevant (e.g., "Make it night time")
  parts.push({ text: `User Additional Text Instructions: "${userPrompt || 'None'}"` });

  // Logic Determination
  const hasReferenceImage = refImages.length > 0;

  // 1. Logic if Style Reference is provided (Strict Replacement + Structure Learning)
  const referenceImageLogic = `
    1. **Objective**: Reconstruct the description of the [Style Reference] image, but perform specific SWAPS based on user uploads.
    2. **The "Unchanged" Rule**: 
       - If a visual element (Pose, Clothing, Art Style, Props) is in [Style Reference] and NOT explicitly replaced by [User Subject] or [User Scene], it MUST be preserved.
       - **Strict Aesthetic Matching**: Pay special attention to the "Style Reference" regarding **Skin Texture**, **Camera Lens Characteristics**, and **Composition**.
    3. **The "Swap" Rule (CRITICAL)**:
       - **Subject Swap**: If [User Subject] is present, describe the main character in the [Style Reference] but with the *face, hair, and physical identity* of the [User Subject].
       - **Background Swap**: If [User Scene] is present:
          - You MUST describe the location, lighting, and time of day VISIBLE in the [User Scene] image.
          - **OVERRIDE**: Ignore the lighting/atmosphere of the [Style Reference] if it conflicts with the [User Scene].
          - **FUSION**: Describe the [User Scene] as the setting, but mapped to the *Perspective/Camera Angle* of the [Style Reference].
  `;

  // 2. Logic if NO Style Reference (Use Template - Giant or Custom or Bathroom)
  const templateLogic = `
    1. **Objective**: Execute the scene described in the **Base Text Template** (Master Script), casting the uploaded images into the roles.
    2. **Strict Text Adherence (Subject/Pose)**:
       - The **Base Text Template** is the authority for **Action**, **Pose**, **Clothing**, and **Camera Angle**.
    3. **The "Cast & Location" Swap (CRITICAL)**:
       - **Subject Integration**: If [User Subject] is provided, the character described in the text MUST take on the **Identity** of the [User Subject].
       - **Background Integration**: If [User Scene] is provided:
          - You MUST describe the location, lighting, time of day, and weather VISIBLE in the [User Scene] image.
          - **OVERRIDE**: You MUST IGNORE any lighting, sky, or environmental descriptions in the Base Text Template (e.g., if template says "sunlight" but user image is "night", use "night").
          - **FUSION**: Place the subject into this [User Scene] environment using the *Pose* and *Camera Angle* from the Template.
    4. **Result**: A fusion where the [User Subject] is enacting the **Base Text Template** pose/action, but physically located inside the [User Scene] environment.
  `;

  // System instruction
  const systemInstruction = `
    You are an expert Image Prompt Reverse-Engineer and Reconstructionist.
    
    YOUR TASK:
    Write a highly detailed image generation prompt for the "Banana Pro" model.
    
    **SAFETY CONSTRAINT (CRITICAL)**:
    - You MUST ensure the output prompt is SAFE for image generation.
    - **Do NOT** include sexually explicit, nude, highly suggestive, or provocative descriptions.
    - If the user input or reference image implies nudity or restricted content, you MUST describe the subject as wearing appropriate clothing (e.g., fashion, casual wear, bathing suit if contextually appropriate but modest) that fits the style.
    - Avoid terms like "cleavage", "soft tissue volume", "provocative", or overly specific anatomical focus that could trigger safety filters.

    **MODE SELECTION**:
    ${hasReferenceImage ?
      `>> MODE: STYLE REFERENCE RECONSTRUCTION
       - **Source of Truth**: The [Style Reference] image for Composition/Style.
       - **Source of Truth (Background)**: The [User Scene] image (if provided) for Lighting/Environment.
       - **Action**: Describe the [Style Reference] structure, but swap the environment with the [User Scene]'s description.`
      :
      `>> MODE: TEMPLATE FUSION
       - **Source of Truth**: The Base Text Template for Pose/Action/Angle.
       - **Source of Truth (Background)**: The [User Scene] image (if provided) for Lighting/Environment.
       - **Action**: Use the Text Template script, but rewrite the setting description to match the [User Scene].`
    }

    --- BASE TEXT TEMPLATE (Only use in Template Fusion Mode) ---
    ${hasReferenceImage ? "(IGNORE TEMPLATE)" : baseTemplate}
    -------------------------------------------------------------

    SPECIFIC INSTRUCTIONS:
    ${hasReferenceImage ? referenceImageLogic : templateLogic}

    OUTPUT:
    - Return ONLY the final, descriptive English prompt. Do not add explanations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || (hasReferenceImage ? "A high quality image" : baseTemplate);
  } catch (error) {
    console.error("Analysis failed:", error);
    return hasReferenceImage ? "A high quality image based on the reference." : baseTemplate;
  }
};

/**
 * Step 2: Generate Image using Gemini 3 Pro Image (Banana Pro)
 */
export const generateImage = async (
  finalPrompt: string,
  resolution: Resolution,
  aspectRatio: AspectRatio,
  referenceImages: { user?: string, scene?: string, style?: string } = {},
  apiKey: string = '',
  modelName: string = 'gemini-3-pro-image-preview'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.VITE_API_KEY || '' });

  const parts: any[] = [];

  // 1. Pass User Subject Image
  if (referenceImages.user) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(referenceImages.user) } });
    parts.push({ text: "Reference Image [ID_SOURCE]: Use this face/identity. Map this identity onto the subject in the composition." });
  }

  // 2. Pass Scene Image
  if (referenceImages.scene) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(referenceImages.scene) } });
    parts.push({ text: "Reference Image [BG_SOURCE]: Use this exact environment. PRESERVE the lighting, color palette, time of day, and mood of this image. The subject must be integrated realistically into THIS specific scene." });
  }

  // 3. Pass Style Reference Image - THE MASTER REFERENCE
  if (referenceImages.style) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(referenceImages.style) } });
    parts.push({ text: "Reference Image [MASTER_COMPOSITION]: This image defines the POSE, ANGLE, CLOTHING, and STYLE. Result must look like this image, but with the [ID_SOURCE] identity and [BG_SOURCE] background swapped in. Keep everything else UNCHANGED." });
  }

  // 4. Prompt
  parts.push({ text: `Create a photorealistic image based on this description: ${finalPrompt}` });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: resolution,
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      if (response.promptFeedback) {
        console.error("Prompt Feedback:", response.promptFeedback);
        throw new Error("Generation blocked by safety filters.");
      }
      throw new Error("No candidates returned from the model.");
    }

    // Iterate to find image part
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    // If no image part, look for text refusal
    const textPart = candidate.content?.parts?.find(p => p.text)?.text;
    if (textPart) {
      throw new Error(`Model refused to generate image: "${textPart.substring(0, 150)}..."`);
    }

    // Check finish reason if no content
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Generation stopped due to: ${candidate.finishReason}`);
    }

    throw new Error("No image data received in response");
  } catch (error: any) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Edit/Inpaint existing image
 */
export const editImage = async (
  originalImageBase64: string,
  editPrompt: string,
  aspectRatio: AspectRatio,
  apiKey: string = '',
  modelName: string = 'gemini-3-pro-image-preview'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.VITE_API_KEY || '' });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(originalImageBase64),
            },
          },
          { text: `Edit this image: ${editPrompt}` },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("No response candidates");

    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    const textPart = candidate.content?.parts?.find(p => p.text)?.text;
    if (textPart) {
      throw new Error(`Model refused edit: "${textPart}"`);
    }

    throw new Error("No edited image received");
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

export const verifyApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  try {
    // Generate a tiny piece of content just to verify auth
    await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: "hello"
    });
    return true;
  } catch (e) {
    console.error("API Key verification failed:", e);
    return false;
  }
};
