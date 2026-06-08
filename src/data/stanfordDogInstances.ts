// solves problem of:
// photo 1: golden retriever puppy
// photo 2: adult golden retriever
// photo 3: different golden retriever outside

/**
 * Group Stanford Dogs filenames into consistent "same dog" instances.
 * Images live in Images/<class-folder>/<classId>_<imageNum>.jpg
 * Sequential imageNum buckets usually share the same individual (ImageNet burst capture).
 */
export function stanfordClassFromFolder(folderName: string): string {
  return folderName;
}

// turns n02099712-Labrador_retriever into Labrador Retriever
export function stanfordLabelFromFolder(folderName: string): string {
  const dash = folderName.indexOf("-");
  if (dash === -1) return folderName.replace(/_/g, " ");
  return folderName
    .slice(dash + 1)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// example file name: n02099712-Labrador_retriever_0001.jpg
// this extracts the 0001
// important bc dataset images are ordered numerically
export function extractStanfordImageNumber(filename: string): number {
  const match = filename.match(/_(\d+)\.jpe?g$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

// sorts filenames by image number
// chunks into groups of 4
// treats each group as one dog instance
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
      // ie: n02099712-Labrador_retriever/12
      // later stored in pet_photos.stanford_instance_key
      instanceKey: `${classFolder}/${bucketNum}`,
      stanfordClass: classFolder,
      filenames: chunk,
    });
  }

  return instances;
}

// given a filename it computes which bucket/instance it belongs to
export function instanceKeyForFilename(
  classFolder: string,
  filename: string,
  bucketSize = 4,
): string {
  const imageNum = extractStanfordImageNumber(filename);
  const bucket = Math.floor(imageNum / bucketSize);
  return `${classFolder}/${bucket}`;
}

// path stored in the database
// ie: /stanford-dogs/Images/n02099712-Labrador_retriever/n02099712-Labrador_retriever_0001.jpg
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
