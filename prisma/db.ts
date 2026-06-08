import "dotenv/config";
// postgres SQL adapter
import { PrismaPg } from "@prisma/adapter-pg";
// client generated from schema.prisma
// every time prisma generate is run
// prisma reads:
//   model Pet
//   model User
//   model City
// and creates:
//   prisma.pet.findMany({})
//   prisma.user.findMany({})
//   prisma.city.findMany({})
import { PrismaClient } from "../generated/prisma/client.js";
// centralizes how db URL is loaded, validation, fallbacks, environment handling
import { getDatabaseUrl } from "./databaseUrl.js";

// creates a postgreSQL connection layer
const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
// creates one shared client
// everywhere else can use import { prisma } from "./db.js";
// and use same connection pool 
// rather than 100 requests -> 100 db connections
export const prisma = new PrismaClient({ adapter });


// example request flow:
// server calls await prisma.pet.findMany(...)
// getPets()
// prisma.pet.findMany(...)
// prisma client
// prismaPG adapter
// postgres wire protocol
// supabase postgres
// rows
// prisma objects
// service

// relationship to render:
// when deployed:
//   render server
//   prisma.pet.findMany(...)
//   supabase db
// render runs file
// supabase stores data
// prisma translates between them