import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var prismaGlobal: PrismaClient;
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
}

export default prisma;
