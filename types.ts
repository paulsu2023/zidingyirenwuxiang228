export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  TALL = '9:16',
  WIDE = '16:9',
}

export enum Resolution {
  R_1K = '1K',
  R_2K = '2K',
  R_4K = '4K',
}

export enum ModelType {
  BANANA_PRO = 'gemini-3-pro-image-preview',
  BANANA_2 = 'gemini-3.1-flash-image-preview',
  BANANA = 'gemini-2.5-flash-image',
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  prompt: string;
  model: ModelType;
}

export type ImageCategory = 'user' | 'scene' | 'reference';
