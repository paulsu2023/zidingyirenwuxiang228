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

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  prompt: string;
}

export type ImageCategory = 'user' | 'scene' | 'reference';
