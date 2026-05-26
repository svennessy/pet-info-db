import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { getDatabaseUrl } from "./databaseUrl.js";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
export const prisma = new PrismaClient({ adapter });
