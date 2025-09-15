export type SignedUploadFields = {
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  overwrite: boolean;
  resourceType: "image";
};
