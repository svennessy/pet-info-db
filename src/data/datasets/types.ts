/** Shared primitives for photo dataset pipelines (fetch → process → seed). */

export type ImageSource =
  | "pixabay"
  | "wikimedia"
  | "stanford"
  | "oxford"
  | "openverse"
  | "pexels"
  | "flickr"
  | string;

export interface ImageLicense {
  name: string;
  attribution: string | null;
}

export interface DatasetBuildInfo {
  builtAt: string;
  source: string;
  imageCount: number;
  instanceCount: number;
}
