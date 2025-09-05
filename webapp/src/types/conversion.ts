// webapp/src/types/conversion.ts

// New interface for direct document conversion
export interface DocumentConversionRequest {
  fileType: string;
  fileContent: string; // base64 encoded file content
}

export interface DocumentConversionResponse {
  text: string;
  length: number;
  previewText: string;
}