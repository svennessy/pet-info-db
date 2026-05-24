/** Match Pixabay hits to the search query that fetched them (not tag-inferred breed). */

export function normalizePixabayTags(tags) {
  return (tags ?? "").toLowerCase().replace(/,/g, " ");
}

/**
 * Breed/kind label implied by the query (e.g. "siamese cat" → "siamese").
 */
export function phraseFromPixabayQuery(query, stripSuffixes = []) {
  let phrase = query.trim().toLowerCase();
  for (const suffix of stripSuffixes) {
    const re = new RegExp(`\\s+${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
    phrase = phrase.replace(re, "").trim();
  }
  return phrase;
}

/**
 * Tags must include the animal keyword and every meaningful word from the query phrase.
 */
export function tagsMatchPixabayQuery(tags, searchQuery, options = {}) {
  const {
    requiredInTags = "cat",
    stripSuffixes = ["cat", "kitten"],
    stopWords = ["cat", "kitten", "pet", "animal", "the", "and", "home", "candid"],
    extraRequired = [],
  } = options;

  const tagStr = normalizePixabayTags(tags);

  if (!tagStr.includes(requiredInTags)) return false;
  for (const word of extraRequired) {
    if (!tagStr.includes(word)) return false;
  }

  const phrase = phraseFromPixabayQuery(searchQuery, stripSuffixes);
  if (!phrase) return true;

  const words = phrase
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.includes(w));

  if (words.length === 0) return true;

  return words.every((w) => tagStr.includes(w));
}

export function tagsMatchPixabayCatQuery(tags, searchQuery) {
  return tagsMatchPixabayQuery(tags, searchQuery, {
    requiredInTags: "cat",
    stripSuffixes: ["cat", "kitten"],
    stopWords: [
      "cat",
      "kitten",
      "pet",
      "animal",
      "the",
      "and",
      "home",
      "candid",
      "breed",
      "smartphone",
      "couch",
      "sofa",
      "window",
      "sunlight",
      "messy",
      "room",
      "hiding",
      "under",
      "table",
      "kitchen",
      "living",
      "floor",
      "carpet",
      "bedroom",
      "backyard",
      "house",
      "rescue",
      "street",
      "fluffy",
      "medium",
      "hair",
      "coat",
      "long",
      "haired",
      "black",
      "white",
    ],
  });
}

export function tagsMatchPixabayRabbitQuery(tags, searchQuery) {
  const tagStr = normalizePixabayTags(tags);
  const hasAnimal =
    tagStr.includes("rabbit") ||
    tagStr.includes("bunny") ||
    tagStr.includes("bunnies") ||
    tagStr.includes("hare");
  if (!hasAnimal) return false;

  const phrase = phraseFromPixabayQuery(searchQuery, [
    "rabbit",
    "bunny",
    "bunnies",
  ]);
  if (!phrase) return true;

  const stopWords = new Set([
    "rabbit",
    "bunny",
    "bunnies",
    "hare",
    "pet",
    "animal",
    "domestic",
    "home",
    "couch",
    "cage",
    "candid",
    "window",
    "sunlight",
    "messy",
    "room",
    "holland",
    "lop",
  ]);
  const words = phrase.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  if (words.length === 0) return true;

  return words.every((w) => tagStr.includes(w));
}

export function tagsMatchPixabayBirdQuery(tags, searchQuery) {
  const tagStr = normalizePixabayTags(tags);
  if (!tagStr.includes("bird")) return false;

  return tagsMatchPixabayQuery(tags, searchQuery, {
    requiredInTags: "bird",
    stripSuffixes: ["bird", "birds"],
    stopWords: [
      "bird",
      "birds",
      "pet",
      "animal",
      "domestic",
      "home",
      "couch",
      "cage",
      "candid",
      "window",
      "sunlight",
      "messy",
      "room",
    ],
  });
}
