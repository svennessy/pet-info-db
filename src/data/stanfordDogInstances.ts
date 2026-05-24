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

export function extractStanfordImageNumber(filename: string): number {
  const match = filename.match(/_(\d+)\.jpe?g$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Group sorted filenames into instances of `bucketSize` consecutive shots.
 * Stanford lists bursts of the same individual in numeric order.
 */
export function groupFilenamesIntoInstances(
  classFolder: string,
  filenames: string[],
  bucketSize = 4,
): Array<{ instanceKey: string; stanfordClass: string; filenames: string[] }> {
  const sorted = [...filenames].sort(
    (a, b) =>
      extractStanfordImageNumber(a) - extractStanfordImageNumber(b) ||
      a.localeCompare(b),
  );
  const instances: Array<{
    instanceKey: string;
    stanfordClass: string;
    filenames: string[];
  }> = [];

  for (let i = 0; i < sorted.length; i += bucketSize) {
    const chunk = sorted.slice(i, i + bucketSize);
    const bucketNum = Math.floor(i / bucketSize);
    instances.push({
      instanceKey: `${classFolder}/${bucketNum}`,
      stanfordClass: classFolder,
      filenames: chunk,
    });
  }

  return instances;
}

export function instanceKeyForFilename(
  classFolder: string,
  filename: string,
  bucketSize = 4,
): string {
  const imageNum = extractStanfordImageNumber(filename);
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
