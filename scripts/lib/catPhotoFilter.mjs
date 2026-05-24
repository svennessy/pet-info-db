/** Reject Wikimedia titles that are not candid cat photos. */

const CAT_WORD =
  /\bcat\b|\bcats\b|\bkitten|\bkittens\b|\bfeline|\bfelis catus|\bkitty\b/i;

const BAD_CONTEXT =
  /\b(midjourney|dall.?e|stable diffusion|ai generated|ai art|illustration|clipart|vector|logo|icon|drawing|cartoon|anime|meme|diagram|taxidermy|skeleton|stamp|coin|sculpture|painting|watercolor|emoji|silhouette|pattern|wallpaper|screenshot|infographic|map|flag|coat of arms|seal of|badge|poster|book cover|magazine cover|statue|monument|grave|cemetery)\b/i;

const STUDIO_CONTEXT =
  /\b(cat show|show cat|cfa|tica|champion|grand champion|pedigree|breed standard|professional portrait|studio portrait|grooming session|exhibition|best in show)\b/i;

/** Wikimedia search hits unrelated topics for short breed names. */
const BAD_HOMONYM =
  /\b(scottish fold (?:mountain|bike|phone|laptop|paper|chair|table|door|window|book|film|song|band|album|restaurant|hotel|street|road|station|university|school|church|castle|bridge|river|lake|park|forest|island|bay|gulf|strait|peninsula|province|state|county|city|town|village|district|region|country|nation|people|person|man|woman|actor|actress|singer|player|team|club|company|brand|product|software|game|movie|series|episode|chapter|page|article|report|study|paper|thesis|conference|workshop|course|class|lesson|lecture|exam|test|quiz|assignment|project|thesis|dissertation))\b/i;

export function isCandidCatPhotoTitle(title, breedHints = []) {
  const t = title.toLowerCase();
  if (BAD_CONTEXT.test(t) || STUDIO_CONTEXT.test(t)) return false;
  if (BAD_HOMONYM.test(t)) return false;
  if (/\bdog\b/.test(t) && !CAT_WORD.test(t)) return false;
  if (/\bpuppy\b/.test(t) && !CAT_WORD.test(t)) return false;

  if (CAT_WORD.test(t)) return true;

  const hints = breedHints.map((h) => h.toLowerCase()).filter(Boolean);
  return hints.some((hint) => t.includes(hint));
}

/** Pixabay-only: reject non-photo hits, art, people, and non-cat subjects. */
export function isPixabayCatPhoto(tags, pixabayType = "photo") {
  if (pixabayType !== "photo") return false;

  const t = (tags ?? "").toLowerCase().replace(/,/g, " ");

  if (
    /\b(cartoon|comic|anime|manga|illustration|vector|clipart|drawing|sketch|painted|painting|artwork|graphic|silhouette|sticker|emoji|logo|icon|animated|animation|3d render|3d art|render|figurine|statue|sculpture|mural|poster|wallpaper|background|texture|mascot|character|digital art|line art|ink drawing|coloring book|clip art|rendering|cgi|cartoon cat|cartoon character|figure)\b/.test(
      t,
    )
  ) {
    return false;
  }

  if (
    /\b(woman|women|man|men|girl|boy|lady|gentleman|person|people|human|female|male|model|selfie|child|children|kid|kids|couple|family|slave|museum|masterpiece|historical|oil on canvas|watercolor|art gallery)\b/.test(
      t,
    )
  ) {
    return false;
  }

  if (/\b(met\b|nypl|perronneau|portrait holding|holding a tray)\b/.test(t)) {
    return false;
  }

  if (
    !/\b(cat|cats|kitten|kittens|feline|kitty|tabby|tomcat|domestic cat)\b/.test(
      t,
    )
  ) {
    return false;
  }

  if (/\b(dog|puppy|canine|bird|parrot|horse|rabbit|bunny|hamster|fish|snake)\b/.test(t)) {
    return false;
  }

  if (/\b(coffee|drinking coffee|morning coffee|coffee cup)\b/.test(t) && !/\bpet cat\b/.test(t)) {
    return false;
  }

  return true;
}

const PUREBRED_TAG_HINTS = [
  "siamese",
  "persian",
  "bengal",
  "maine coon",
  "ragdoll",
  "sphynx",
  "abyssinian",
  "scottish fold",
  "british shorthair",
  "russian blue",
  "devon rex",
  "exotic shorthair",
  "american shorthair",
];

/** Pixabay tags must mention the breed (or pattern for domestic types). */
export function tagsMatchCatBreed(tags, breedName, slug) {
  const tagStr = (tags ?? "").toLowerCase().replace(/,/g, " ");
  const hasCat =
    tagStr.includes("cat") ||
    tagStr.includes("kitten") ||
    tagStr.includes("feline") ||
    tagStr.includes("kitty");
  if (!hasCat) return false;

  const base = breedName.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();

  const rules = {
    "tabby-mix": () => tagStr.includes("tabby"),
    tuxedo: () =>
      tagStr.includes("tuxedo") ||
      (tagStr.includes("black") &&
        tagStr.includes("white") &&
        !tagStr.includes("calico")),
    calico: () => tagStr.includes("calico"),
    torbie: () =>
      tagStr.includes("torbie") ||
      tagStr.includes("tortoiseshell") ||
      tagStr.includes("tortie") ||
      (tagStr.includes("tabby") &&
        (tagStr.includes("tortoiseshell") || tagStr.includes("tortie"))),
    siamese: () => tagStr.includes("siamese"),
    "maine-coon": () => /maine[\s-]?coon/.test(tagStr),
    ragdoll: () => tagStr.includes("ragdoll"),
    persian: () => tagStr.includes("persian") && !tagStr.includes("exotic"),
    bengal: () => tagStr.includes("bengal"),
    "russian-blue": () => tagStr.includes("russian") && tagStr.includes("blue"),
    "british-shorthair": () =>
      tagStr.includes("british") &&
      (tagStr.includes("shorthair") || tagStr.includes("short hair")),
    "american-shorthair": () =>
      tagStr.includes("american") &&
      !tagStr.includes("british") &&
      (tagStr.includes("shorthair") ||
        tagStr.includes("short hair") ||
        tagStr.includes("short-hair")),
    "scottish-fold": () =>
      tagStr.includes("scottish") && tagStr.includes("fold"),
    sphynx: () => tagStr.includes("sphynx") || tagStr.includes("hairless"),
    abyssinian: () => tagStr.includes("abyssinian"),
    "exotic-shorthair": () =>
      tagStr.includes("exotic") &&
      (tagStr.includes("shorthair") || tagStr.includes("short hair")),
    "devon-rex": () =>
      (tagStr.includes("devon") && tagStr.includes("rex")) || tagStr.includes("devon rex"),
    "domestic-shorthair": () =>
      !PUREBRED_TAG_HINTS.some((hint) => tagStr.includes(hint)) &&
      (tagStr.includes("domestic") ||
        tagStr.includes("tabby") ||
        tagStr.includes("house") ||
        tagStr.includes("pet")),
    "domestic-longhair": () =>
      !PUREBRED_TAG_HINTS.some((hint) => tagStr.includes(hint)) &&
      (tagStr.includes("longhair") ||
        tagStr.includes("long hair") ||
        tagStr.includes("fluffy") ||
        tagStr.includes("long-haired")),
    "domestic-medium-hair": () =>
      !PUREBRED_TAG_HINTS.some((hint) => tagStr.includes(hint)) &&
      tagStr.includes("cat"),
  };

  const rule = rules[slug];
  if (rule) return rule();

  const words = base.split(/\s+/).filter((w) => w.length > 2);
  return words.every((w) => tagStr.includes(w));
}

export function buildCatPixabayQueries(breed) {
  const overrides = PIXABAY_QUERY_OVERRIDES[breed.slug];
  if (overrides) return overrides;

  const base = breed.name.replace(/\s*\([^)]*\)/g, "").trim();
  const queries = [`${base} cat`, `${base} kitten`];
  for (const q of breed.extraQueries ?? []) {
    queries.push(q);
  }
  return [...new Set(queries)].slice(0, 6);
}

const PIXABAY_QUERY_OVERRIDES = {
  torbie: [
    "torbie cat",
    "tortoiseshell tabby cat",
    "tortie tabby cat",
    "patched tabby cat",
  ],
  "american-shorthair": [
    "american shorthair cat",
    "american shorthair kitten",
    "american cat shorthair breed",
  ],
  tuxedo: ["tuxedo cat", "black white tuxedo cat"],
  "tabby-mix": ["tabby cat", "mackerel tabby cat", "brown tabby cat"],
  "domestic-shorthair": ["domestic shorthair cat", "house cat tabby", "tabby house cat"],
  "domestic-longhair": ["longhair cat fluffy", "domestic longhair cat"],
  sphynx: ["sphynx cat hairless", "sphynx kitten", "hairless cat sphynx"],
  "devon-rex": ["devon rex cat", "devon rex kitten"],
  "exotic-shorthair": ["exotic shorthair cat", "exotic shorthair kitten"],
};

/** Top 20 cat breeds for pets (by weight) with extra Wikimedia search terms. */
export const TOP_CAT_BREEDS_FOR_PHOTOS = [
  {
    slug: "domestic-shorthair",
    name: "Domestic Shorthair",
    group: "domestic",
    extraQueries: [
      "house cat candid",
      "domestic cat home pet",
      "rescue cat smartphone",
      "tabby house cat backyard",
    ],
  },
  {
    slug: "domestic-longhair",
    name: "Domestic Longhair",
    group: "domestic",
    extraQueries: [
      "long haired house cat",
      "fluffy domestic cat home",
      "rescue longhair cat",
    ],
  },
  {
    slug: "domestic-medium-hair",
    name: "Domestic Medium Hair",
    group: "domestic",
    extraQueries: ["medium hair domestic cat", "house cat medium coat"],
  },
  {
    slug: "tabby-mix",
    name: "Tabby Mix",
    group: "domestic",
    extraQueries: [
      "tabby cat candid",
      "mackerel tabby cat home",
      "brown tabby cat pet",
    ],
  },
  {
    slug: "tuxedo",
    name: "Tuxedo (Domestic)",
    group: "domestic",
    extraQueries: ["tuxedo cat black white pet", "black and white house cat"],
  },
  {
    slug: "calico",
    name: "Calico (Domestic)",
    group: "domestic",
    extraQueries: ["calico cat home pet", "calico house cat candid"],
  },
  {
    slug: "torbie",
    name: "Torbie (Domestic)",
    group: "domestic",
    extraQueries: ["torbie cat patched tabby", "tortoiseshell tabby cat"],
  },
  {
    slug: "american-shorthair",
    name: "American Shorthair",
    group: "shorthair",
    extraQueries: ["american shorthair cat pet home"],
  },
  {
    slug: "siamese",
    name: "Siamese",
    group: "oriental",
    extraQueries: ["siamese cat home pet", "siamese kitten candid"],
  },
  {
    slug: "maine-coon",
    name: "Maine Coon",
    group: "natural",
    extraQueries: ["maine coon cat home", "maine coon pet candid"],
  },
  {
    slug: "ragdoll",
    name: "Ragdoll",
    group: "semi_longhair",
    extraQueries: ["ragdoll cat home pet", "ragdoll kitten candid"],
  },
  {
    slug: "persian",
    name: "Persian",
    group: "longhair",
    extraQueries: ["persian cat home pet", "persian kitten candid"],
  },
  {
    slug: "bengal",
    name: "Bengal",
    group: "hybrid",
    extraQueries: ["bengal cat pet home", "bengal kitten candid"],
  },
  {
    slug: "russian-blue",
    name: "Russian Blue",
    group: "shorthair",
    extraQueries: ["russian blue cat pet", "russian blue kitten home"],
  },
  {
    slug: "british-shorthair",
    name: "British Shorthair",
    group: "shorthair",
    extraQueries: ["british shorthair cat pet home"],
  },
  {
    slug: "scottish-fold",
    name: "Scottish Fold",
    group: "shorthair",
    extraQueries: ["scottish fold cat pet", "scottish fold kitten home"],
  },
  {
    slug: "sphynx",
    name: "Sphynx",
    group: "hairless",
    extraQueries: ["sphynx cat home pet", "hairless cat candid"],
  },
  {
    slug: "abyssinian",
    name: "Abyssinian",
    group: "shorthair",
    extraQueries: ["abyssinian cat pet home"],
  },
  {
    slug: "exotic-shorthair",
    name: "Exotic Shorthair",
    group: "shorthair",
    extraQueries: ["exotic shorthair cat pet", "exotic shorthair kitten home"],
  },
  {
    slug: "devon-rex",
    name: "Devon Rex",
    group: "rex",
    extraQueries: ["devon rex cat pet", "devon rex kitten home"],
  },
];
