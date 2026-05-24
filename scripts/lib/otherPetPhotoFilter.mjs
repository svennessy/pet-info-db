import {
  tagsMatchPixabayBirdQuery,
  tagsMatchPixabayRabbitQuery,
} from "./pixabayQueryMatch.mjs";

const PIXABAY_REJECT =
  /\b(cartoon|comic|anime|manga|illustration|vector|clipart|drawing|sketch|painted|painting|artwork|graphic|silhouette|sticker|emoji|logo|icon|animated|animation|3d render|3d art|render|figurine|statue|sculpture|mural|poster|wallpaper|background|texture|mascot|character|digital art|line art|ink drawing|coloring book|clip art|rendering|cgi|figure|studio)\b/;

const PIXABAY_HUMAN =
  /\b(woman|women|man|men|girl|boy|lady|gentleman|person|people|human|female|male|model|selfie|child|children|kid|kids|couple|family|museum|masterpiece|historical|oil on canvas|watercolor|art gallery)\b/;

function basePixabayOk(tags, pixabayType) {
  if (pixabayType !== "photo") return false;
  const t = (tags ?? "").toLowerCase().replace(/,/g, " ");
  if (PIXABAY_REJECT.test(t) || PIXABAY_HUMAN.test(t)) return false;
  return t;
}

export function isPixabayRabbitPhoto(tags, pixabayType = "photo") {
  const t = basePixabayOk(tags, pixabayType);
  if (!t) return false;
  if (!t.includes("rabbit") && !t.includes("bunny") && !t.includes("bunnies")) {
    return false;
  }
  if (/\b(bird|parrot|cat|dog|fish)\b/.test(t)) return false;
  return true;
}

export function isPixabayBirdPhoto(tags, pixabayType = "photo") {
  const t = basePixabayOk(tags, pixabayType);
  if (!t) return false;
  if (!t.includes("bird")) return false;
  if (/\b(rabbit|bunny|cat|dog|fish|hamster)\b/.test(t)) return false;
  return true;
}

/** Kind + query-locked tag check (use with searchQuery from the fetch loop). */
export function matchPixabayOtherPetPhoto(
  tags,
  pixabayType,
  kindSlug,
  searchQuery,
) {
  if (kindSlug === "rabbit") {
    return (
      isPixabayRabbitPhoto(tags, pixabayType) &&
      tagsMatchPixabayRabbitQuery(tags, searchQuery)
    );
  }
  if (kindSlug.startsWith("bird-")) {
    return (
      isPixabayBirdPhoto(tags, pixabayType) &&
      tagsMatchPixabayBirdQuery(tags, searchQuery)
    );
  }
  return false;
}

export const OTHER_PET_PHOTO_HARVEST = [
  {
    slug: "rabbit",
    kind: "Rabbit",
    queries: [
      "rabbit home pet",
      "bunny rabbit couch",
      "pet rabbit cage",
      "holland lop rabbit home",
      "domestic rabbit messy room",
      "bunny rabbit window",
    ],
  },
  {
    slug: "bird-parakeet",
    kind: "Bird",
    queries: [
      "green parakeet pet",
      "budgie bird home",
      "parakeet cage pet",
      "blue budgie bird couch",
      "parakeet bird window",
    ],
  },
  {
    slug: "bird-cockatiel",
    kind: "Bird",
    queries: [
      "cockatiel pet home",
      "cockatiel bird couch",
      "grey cockatiel cage",
      "cockatiel bird candid",
    ],
  },
  {
    slug: "bird-canary",
    kind: "Bird",
    queries: [
      "yellow canary pet",
      "canary bird home",
      "pet canary cage",
      "canary bird window sunlight",
    ],
  },
  {
    slug: "bird-lovebird",
    kind: "Bird",
    queries: [
      "lovebird pet home",
      "lovebird bird couch",
      "peach faced lovebird pet",
      "lovebird cage candid",
    ],
  },
  {
    slug: "bird-parrot",
    kind: "Bird",
    queries: [
      "macaw parrot pet",
      "red macaw bird home",
      "african grey parrot pet",
      "parrot bird couch",
      "blue parrot pet cage",
    ],
  },
];
