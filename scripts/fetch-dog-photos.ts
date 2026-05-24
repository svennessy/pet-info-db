/**
 * Harvest license-free dog photos weighted by breed commonality.
 * Sources: Openverse, Wikimedia Commons, optional Pexels/Pixabay.
 */
import "dotenv/config";
import { DOG_BREEDS } from "../src/data/dogBreeds.js";
import {
  allocatePhotosByWeight,
  DOG_PHOTO_TARGET,
} from "../src/data/allocateBreedPhotos.js";
import { prisma } from "../prisma/db.js";
import { buildSearchQueries, normalizeUrl, sleep } from "./lib/photoFetchUtils.mjs";
import { collectFromOpenverse } from "./lib/openversePhotos.mjs";
import { collectFromWikimedia } from "./lib/wikimediaPhotos.mjs";
import { collectFromPexels } from "./lib/pexelsPhotos.mjs";
import { collectFromPixabay } from "./lib/pixabayPhotos.mjs";
import { collectFromFlickr } from "./lib/flickrPhotos.mjs";

type PhotoPayload = {
  imageUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  source: string;
  license: string;
  attribution: string | null;
  searchQuery: string;
  candidScore: number;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let target = DOG_PHOTO_TARGET;
  let limit: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target" && args[i + 1]) target = Number(args[++i]);
    if (args[i] === "--limit" && args[i + 1]) limit = Number(args[++i]);
  }
  return { target, limit };
}

async function main() {
  const { target, limit } = parseArgs();
  const breeds = DOG_BREEDS.map((b) => ({
    slug: b.id,
    name: b.name,
    weight: b.weight,
    group: b.group ?? null,
  }));
  const quotas = allocatePhotosByWeight(
    breeds.map((b) => ({ slug: b.slug, weight: b.weight })),
    target,
  );

  const pexelsKey = process.env.PEXELS_API_KEY?.trim();
  const pixabayKey = process.env.PIXABAY_API_KEY?.trim();
  const flickrKey = process.env.FLICKR_API_KEY?.trim();
  const openverseConfigured =
    Boolean(process.env.OPENVERSE_CLIENT_ID?.trim()) &&
    Boolean(process.env.OPENVERSE_CLIENT_SECRET?.trim());

  const existing = await prisma.dogBreedPhoto.groupBy({
    by: ["breedSlug"],
    _count: { _all: true },
  });
  const haveByBreed = Object.fromEntries(
    existing.map((r) => [r.breedSlug, r._count._all]),
  );

  const usedRows = await prisma.dogBreedPhoto.findMany({
    select: { imageUrl: true },
  });
  const usedUrls = new Set(usedRows.map((r) => normalizeUrl(r.imageUrl)));

  let insertedTotal = 0;
  const batch: Array<{
    breedSlug: string;
    imageUrl: string;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    source: string;
    license: string;
    attribution: string | null;
    searchQuery: string;
    candidScore: number;
  }> = [];

  const BATCH_SIZE = 100;

  async function flush() {
    if (batch.length === 0) return;
    const chunk = batch.splice(0, batch.length);
    const result = await prisma.dogBreedPhoto.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedTotal += result.count;
  }

  async function onPhoto(breedSlug: string, photo: PhotoPayload) {
    batch.push({
      breedSlug,
      imageUrl: photo.imageUrl,
      thumbnailUrl: photo.thumbnailUrl,
      width: photo.width,
      height: photo.height,
      source: photo.source,
      license: photo.license,
      attribution: photo.attribution,
      searchQuery: photo.searchQuery,
      candidScore: photo.candidScore,
    });
    if (batch.length >= BATCH_SIZE) await flush();
  }

  const breedOrder = [...breeds].sort((a, b) => b.weight - a.weight);

  console.log(
    `Dog photos: target ${target}, ${usedUrls.size} unique urls already in DB`,
  );
  console.log("  + Wikimedia Commons (always)");
  if (openverseConfigured) console.log("  + Openverse API");
  if (flickrKey) console.log("  + Flickr API");
  if (pexelsKey) console.log("  + Pexels API");
  if (pixabayKey) console.log("  + Pixabay API");

  for (const breed of breedOrder) {
    if (limit != null && insertedTotal >= limit) break;

    const quota = quotas[breed.slug] ?? 0;
    const have = haveByBreed[breed.slug] ?? 0;
    let need = quota - have;
    if (limit != null) need = Math.min(need, limit - insertedTotal);
    if (need <= 0) continue;

    const queries = buildSearchQueries(breed.name, breed.group);
    console.log(`\n${breed.name} (${breed.slug}): need ${need} / ${quota}`);

    let got = 0;
    const handle = (photo: PhotoPayload) => onPhoto(breed.slug, photo);

    got += await collectFromWikimedia({
      queries,
      needed: need - got,
      usedUrls,
      onPhoto: handle,
    });

    if (got < need && openverseConfigured) {
      got += await collectFromOpenverse({
        queries,
        needed: need - got,
        usedUrls,
        onPhoto: handle,
      });
    }

    if (got < need && flickrKey) {
      got += await collectFromFlickr({
        queries,
        needed: need - got,
        usedUrls,
        onPhoto: handle,
        apiKey: flickrKey,
      });
    }

    if (got < need && pexelsKey) {
      got += await collectFromPexels({
        queries,
        needed: need - got,
        usedUrls,
        onPhoto: handle,
        apiKey: pexelsKey,
      });
    }

    if (got < need && pixabayKey) {
      got += await collectFromPixabay({
        queries,
        needed: need - got,
        usedUrls,
        onPhoto: handle,
        apiKey: pixabayKey,
      });
    }

    await flush();
    console.log(`  +${got} this breed (${insertedTotal} new rows total)`);

    if (got < need) {
      console.warn(`  shortfall ${need - got} for ${breed.slug}`);
    }

    await sleep(200);
  }

  await flush();
  const total = await prisma.dogBreedPhoto.count();
  console.log(`\nDone. ${total} dog breed photos in database.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
