import type { DogBreed } from "./dogBreedTypes";
import {
  STANFORD_GROUP_PROXY,
  STANFORD_SLUG_PROXY,
} from "./stanfordBreedProxies";
import stanfordSlugOverrides from "./stanfordSlugOverrides.json";

export function normalizeBreedLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MANUAL_OVERRIDES: Record<string, string> =
  stanfordSlugOverrides as Record<string, string>;

/** Mixed breeds and doodles without a better proxy. */
export const STANFORD_FALLBACK_CLASS = "n02099601-golden_retriever";

const MIN_TOKEN_SCORE = 45;

export function resolveStanfordFolder(
  folder: string,
  classFolders: readonly string[],
): string | null {
  if (classFolders.includes(folder)) return folder;

  const lower = folder.toLowerCase();
  const caseMatch = classFolders.find((f) => f.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  const suffix = folder.includes("-") ? folder.slice(folder.indexOf("-") + 1) : folder;
  const suffixLower = suffix.toLowerCase();
  const suffixMatch = classFolders.find((f) => {
    const part = f.includes("-") ? f.slice(f.indexOf("-") + 1) : f;
    return part.toLowerCase() === suffixLower;
  });
  return suffixMatch ?? null;
}

export function buildStanfordClassLookup(classFolders: readonly string[]) {
  const byLabel = new Map<string, string>();
  for (const folder of classFolders) {
    const dash = folder.indexOf("-");
    const label =
      dash === -1
        ? folder
        : folder
            .slice(dash + 1)
            .replace(/_/g, " ")
            .toLowerCase();
    byLabel.set(normalizeBreedLabel(label), folder);
  }
  return byLabel;
}

function folderLabel(folder: string): string {
  const dash = folder.indexOf("-");
  const raw = dash === -1 ? folder : folder.slice(dash + 1);
  return normalizeBreedLabel(raw.replace(/_/g, " "));
}

/** Shared words that alone should not link unrelated breeds (e.g. Anatolian Shepherd → German Shepherd). */
const WEAK_MATCH_TOKENS = new Set([
  "dog",
  "shepherd",
  "terrier",
  "spaniel",
  "hound",
  "retriever",
  "bulldog",
]);

function matchScore(normalizedName: string, folder: string): number {
  const label = folderLabel(folder);
  if (normalizedName === label) return 100;

  const nameTokens = normalizedName.split(" ").filter(Boolean);
  const labelTokens = label.split(" ").filter(Boolean);
  if (nameTokens.length === 0 || labelTokens.length === 0) return 0;

  const sharedTokens = nameTokens.filter((t) => labelTokens.includes(t));
  if (sharedTokens.length === 0) return 0;

  const strongShared = sharedTokens.filter((t) => !WEAK_MATCH_TOKENS.has(t));
  if (
    strongShared.length === 0 &&
    nameTokens.some((t) => !WEAK_MATCH_TOKENS.has(t))
  ) {
    return 0;
  }

  const overlap = sharedTokens.length;

  const tokenScore =
    (overlap / Math.max(nameTokens.length, labelTokens.length)) * 85;

  if (
    normalizedName.startsWith(label) ||
    label.startsWith(normalizedName) ||
    normalizedName.endsWith(label) ||
    label.endsWith(normalizedName)
  ) {
    return Math.max(tokenScore, 75);
  }

  return tokenScore;
}

function proxyForSlug(
  slug: string,
  classFolders: readonly string[],
): string | null {
  const candidates = [
    MANUAL_OVERRIDES[slug],
    STANFORD_SLUG_PROXY[slug],
  ];
  for (const folder of candidates) {
    if (!folder) continue;
    const resolved = resolveStanfordFolder(folder, classFolders);
    if (resolved) return resolved;
  }
  return null;
}

function proxyForGroup(
  group: DogBreed["group"],
  classFolders: readonly string[],
): string | null {
  if (!group) return null;
  const folder = STANFORD_GROUP_PROXY[group];
  return resolveStanfordFolder(folder, classFolders);
}

export function matchBreedToStanfordClass(
  breed: Pick<DogBreed, "id" | "name" | "group">,
  byLabel: Map<string, string>,
  classFolders: readonly string[],
): string {
  const fromSlug = proxyForSlug(breed.id, classFolders);
  if (fromSlug) return fromSlug;

  const normalizedName = normalizeBreedLabel(breed.name);
  const direct = byLabel.get(normalizedName);
  if (direct) return direct;

  let bestFolder = classFolders[0] ?? STANFORD_FALLBACK_CLASS;
  let bestScore = 0;

  for (const folder of classFolders) {
    const score = matchScore(normalizedName, folder);
    if (score > bestScore) {
      bestScore = score;
      bestFolder = folder;
    }
  }

  if (bestScore >= MIN_TOKEN_SCORE) return bestFolder;

  const fromGroup = proxyForGroup(breed.group, classFolders);
  if (fromGroup) return fromGroup;

  if (breed.id === "mixed-breed") {
    return (
      resolveStanfordFolder(
        "n02099712-Labrador_retriever",
        classFolders,
      ) ?? bestFolder
    );
  }

  if (
    breed.id.includes("doodle") ||
    (breed.id.endsWith("-mix") && breed.id !== "mixed-breed") ||
    breed.id.includes("mix")
  ) {
    return (
      resolveStanfordFolder(STANFORD_FALLBACK_CLASS, classFolders) ??
      bestFolder
    );
  }

  return bestFolder;
}
