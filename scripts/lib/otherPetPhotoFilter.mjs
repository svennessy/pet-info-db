import {
  tagsMatchPixabayBirdQuery,
  tagsMatchPixabayRabbitQuery,
} from "./pixabayQueryMatch.mjs";

const PIXABAY_REJECT =
  /\b(cartoon|comic|anime|manga|illustration|vector|clipart|drawing|sketch|painted|painting|artwork|graphic|silhouette|sticker|emoji|logo|icon|animated|animation|3d render|3d art|render|figurine|statue|sculpture|mural|poster|wallpaper|background|texture|mascot|character|digital art|line art|ink drawing|coloring book|clip art|rendering|cgi|figure)\b/;

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
export function matchPixabayOtherPetPhoto(tags, pixabayType, kindSlug, searchQuery) {
  if (kindSlug === "rabbit") {
    return (
      isPixabayRabbitPhoto(tags, pixabayType) &&
      tagsMatchPixabayRabbitQuery(tags, searchQuery)
    );
  }
  if (kindSlug === "bird") {
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
      "pet rabbit",
      "domestic rabbit",
      "bunny rabbit",
      "holland lop rabbit",
      "rabbit animal pet",
    ],
  },
  {
    slug: "bird",
    kind: "Bird",
    queries: [
      "pet bird",
      "parakeet bird",
      "cockatiel pet",
      "budgie bird",
      "domestic bird pet",
    ],
  },
];
