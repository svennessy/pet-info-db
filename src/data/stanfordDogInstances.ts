/**
 * Group Stanford Dogs filenames into consistent "same dog" instances.
 * Images live in Images/<class-folder>/<classId>_<imageNum>.jpg
 * Sequential imageNum buckets usually share the same individual (ImageNet burst capture).
 */
export function stanfordClassFromFolder(folderName: string): string {
  return folderName;
}

export function stanfordLabelFromFolder(folderName: string): string {
  const dash = folderName.indexOf("-");
  if (dash === -1) return folderName.replace(/_/g, " ");
  return folderName
    .slice(dash + 1)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function instanceKeyForFilename(
  classFolder: string,
  filename: string,
  bucketSize = 4,
): string {
  const match = filename.match(/_(\d+)\.jpe?g$/i);
  if (!match) return `${classFolder}/misc`;
  const imageNum = Number.parseInt(match[1], 10);
  const bucket = Math.floor(imageNum / bucketSize);
  return `${classFolder}/${bucket}`;
}

export function publicImagePath(classFolder: string, filename: string): string {
  return `/stanford-dogs/Images/${classFolder}/${filename}`;
}

/** 1–4 photos per pet (matches user request). */
export const PET_PHOTO_COUNT_WEIGHTS: readonly { count: number; weight: number }[] =
  [
    { count: 1, weight: 18 },
    { count: 2, weight: 32 },
    { count: 3, weight: 32 },
    { count: 4, weight: 18 },
  ];
