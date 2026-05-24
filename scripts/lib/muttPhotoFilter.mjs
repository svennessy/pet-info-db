/** Reject Wikimedia titles that are not dog photos. */
const DOG_WORD =
  /\bdog\b|\bpupp(?:y|ies)\b|\bcanine\b|\bcanis lupus familiaris\b/i;

const MUTT_PHRASE =
  /\b(mixed breed|mixed-breed|mongrel|crossbreed|cross breed|cross-breed|heinz 57|rescue dog|shelter dog)\b/i;

/** "Mutt" alone often means a Hindu monastery, aircraft, etc. */
const BAD_MUTT_CONTEXT =
  /\b(shankar|raghavendra|vyasraja|parakala|sant\s*hasramam|ford mutt|x-56|mallard|geograph|muttaburrasaurus|hohen mutt|delegatsiooni|traffic signal)\b/i;

export function isMuttPhotoTitle(title) {
  const t = title.toLowerCase();
  if (!DOG_WORD.test(t)) return false;
  if (BAD_MUTT_CONTEXT.test(t)) return false;
  if (MUTT_PHRASE.test(t)) return true;
  if (/\bmixed\b/.test(t) && /\bdog\b/.test(t)) return true;
  if (/\bmutt\b/.test(t) && /\bdog\b/.test(t)) return true;
  return false;
}

export const MUTT_WIKIMEDIA_QUERIES = [
  "mixed breed dog",
  "mongrel dog",
  "crossbreed dog",
  "mixed breed puppy",
  "rescue dog mixed breed",
  "shelter dog mixed breed",
  "heinz 57 dog",
];
