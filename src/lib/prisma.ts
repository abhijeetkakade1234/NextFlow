// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  // Use DIRECT_URL or DATABASE_URL from process.env
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL
  
  if (!url) {
    throw new Error('Database connection string (DATABASE_URL or DIRECT_URL) is missing.')
  }

  // pg Pool is very stable and standard
  const pool = new Pool({ connectionString: url })
  const adapter = new PrismaPg(pool as any)
  
  return new PrismaClient({ 
    adapter,
    log: ['error']
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
