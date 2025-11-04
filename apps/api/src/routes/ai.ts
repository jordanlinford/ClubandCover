import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import { prisma } from '../lib/prisma.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';
import {
  isAIEnabled,
  generateBlurb,
  generateEmbedding,
  cosineSimilarity,
  genreOverlapScore,
  getEmbeddingText,
} from '../lib/ai.js';

// Schemas
const generateBlurbSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  genres: z.array(z.string()).optional(),
  subtitle: z.string().optional(),
  currentBlurb: z.string().optional(),
});

const indexOneSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['BOOK', 'CLUB']),
});

const matchSchema = z.object({
  bookId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
}).refine(data => data.bookId || data.clubId, {
  message: 'Either bookId or clubId must be provided',
});

export async function aiRoutes(fastify: FastifyInstance) {
  // POST /api/ai/generate-blurb
  fastify.post('/generate-blurb', {
    preHandler: aiRateLimit,
    handler: async (request, reply) => {
      if (!isAIEnabled()) {
        return reply.code(501).send({
          success: false,
          error: 'AI features are not available. OPENAI_API_KEY is not configured.',
        });
      }

      try {
        const body = generateBlurbSchema.parse(request.body);
        const blurb = await generateBlurb(body);

        return reply.send({
          success: true,
          data: { blurb },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: fromError(error).toString(),
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to generate blurb',
        });
      }
    },
  });

  // POST /api/ai/index-one
  fastify.post('/index-one', {
    preHandler: aiRateLimit,
    handler: async (request, reply) => {
      if (!isAIEnabled()) {
        return reply.code(501).send({
          success: false,
          error: 'AI features are not available. OPENAI_API_KEY is not configured.',
        });
      }

      try {
        const body = indexOneSchema.parse(request.body);
        const { entityId, entityType } = body;

        // Fetch entity
        let entity: any;
        if (entityType === 'BOOK') {
          entity = await prisma.book.findUnique({
            where: { id: entityId },
            select: {
              title: true,
              subtitle: true,
              author: true,
              description: true,
              genres: true,
            },
          });
        } else {
          entity = await prisma.club.findUnique({
            where: { id: entityId },
            select: {
              name: true,
              description: true,
              genres: true,
            },
          });
        }

        if (!entity) {
          return reply.code(404).send({
            success: false,
            error: `${entityType} not found`,
          });
        }

        // Generate embedding text
        const embeddingText = getEmbeddingText(entity);
        const vector = await generateEmbedding(embeddingText);

        // Upsert embedding
        const embeddingData = {
          entityType,
          embedding: JSON.stringify(vector),
          ...(entityType === 'BOOK' ? { bookId: entityId } : { clubId: entityId }),
        };

        const embedding = await prisma.embedding.upsert({
          where: entityType === 'BOOK' ? { bookId: entityId } : { clubId: entityId },
          create: embeddingData,
          update: {
            embedding: JSON.stringify(vector),
          },
        });

        return reply.send({
          success: true,
          data: { embeddingId: embedding.id },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: fromError(error).toString(),
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to index entity',
        });
      }
    },
  });

  // POST /api/ai/reindex (STAFF only)
  fastify.post('/reindex', async (request, reply) => {
    if (!isAIEnabled()) {
      return reply.code(501).send({
        success: false,
        error: 'AI features are not available. OPENAI_API_KEY is not configured.',
      });
    }

    // Check if user is STAFF
    if (request.user?.role !== 'STAFF') {
      return reply.code(403).send({
        success: false,
        error: 'Only STAFF members can reindex all entities',
      });
    }

    try {
      // Index all books
      const books = await prisma.book.findMany({
        select: {
          id: true,
          title: true,
          subtitle: true,
          author: true,
          description: true,
          genres: true,
        },
      });

      let booksIndexed = 0;
      for (const book of books) {
        const embeddingText = getEmbeddingText(book);
        const vector = await generateEmbedding(embeddingText);

        await prisma.embedding.upsert({
          where: { bookId: book.id },
          create: {
            entityType: 'BOOK',
            bookId: book.id,
            embedding: JSON.stringify(vector),
          },
          update: {
            embedding: JSON.stringify(vector),
          },
        });
        booksIndexed++;
      }

      // Index all clubs
      const clubs = await prisma.club.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          genres: true,
        },
      });

      let clubsIndexed = 0;
      for (const club of clubs) {
        const embeddingText = getEmbeddingText(club);
        const vector = await generateEmbedding(embeddingText);

        await prisma.embedding.upsert({
          where: { clubId: club.id },
          create: {
            entityType: 'CLUB',
            clubId: club.id,
            embedding: JSON.stringify(vector),
          },
          update: {
            embedding: JSON.stringify(vector),
          },
        });
        clubsIndexed++;
      }

      return reply.send({
        success: true,
        data: {
          booksIndexed,
          clubsIndexed,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to reindex entities',
      });
    }
  });

  // POST /api/ai/match
  fastify.post('/match', async (request, reply) => {
    if (!isAIEnabled()) {
      return reply.code(501).send({
        success: false,
        error: 'AI features are not available. OPENAI_API_KEY is not configured.',
      });
    }

    try {
      const body = matchSchema.parse(request.body);
      const { bookId, clubId } = body;

      let sourceEntity: any;
      let sourceEmbedding: any;
      let searchType: 'BOOK' | 'CLUB';

      if (bookId) {
        // Find clubs that match this book
        sourceEntity = await prisma.book.findUnique({
          where: { id: bookId },
          select: {
            title: true,
            genres: true,
            embeddings: true,
          },
        });

        if (!sourceEntity) {
          return reply.code(404).send({
            success: false,
            error: 'Book not found',
          });
        }

        sourceEmbedding = sourceEntity.embeddings[0];
        searchType = 'CLUB';
      } else if (clubId) {
        // Find books that match this club
        sourceEntity = await prisma.club.findUnique({
          where: { id: clubId },
          select: {
            name: true,
            genres: true,
            embeddings: true,
          },
        });

        if (!sourceEntity) {
          return reply.code(404).send({
            success: false,
            error: 'Club not found',
          });
        }

        sourceEmbedding = sourceEntity.embeddings[0];
        searchType = 'BOOK';
      }

      if (!sourceEmbedding) {
        return reply.code(404).send({
          success: false,
          error: 'Source entity has no embedding. Please index it first.',
        });
      }

      const sourceVector = JSON.parse(sourceEmbedding.embedding);

      // Get all potential matches
      const candidates = await prisma.embedding.findMany({
        where: {
          entityType: searchType,
        },
        include: searchType === 'BOOK' ? {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              genres: true,
            },
          },
        } : {
          club: {
            select: {
              id: true,
              name: true,
              description: true,
              genres: true,
            },
          },
        },
      });

      // Calculate scores
      const matches = candidates.map(candidate => {
        const targetVector = JSON.parse(candidate.embedding);
        const similarity = cosineSimilarity(sourceVector, targetVector);
        
        const targetEntity = searchType === 'BOOK' ? candidate.book! : candidate.club!;
        const targetGenres = targetEntity.genres || [];
        const sourceGenres = sourceEntity.genres || [];
        const genreScore = genreOverlapScore(sourceGenres, targetGenres);

        // Combined score (70% similarity, 30% genre overlap)
        const score = similarity * 0.7 + genreScore * 0.3;

        // Generate "why" explanation
        let why = '';
        if (genreScore > 0.3) {
          const sharedGenres = targetGenres.filter((g: string) =>
            sourceGenres.some((sg: string) => sg.toLowerCase() === g.toLowerCase())
          );
          why = `Shares ${sharedGenres.length > 0 ? sharedGenres.join(', ') : 'similar'} genre interests`;
        } else {
          why = 'Similar themes and content based on AI analysis';
        }

        return {
          id: targetEntity.id,
          name: searchType === 'BOOK' ? `${targetEntity.title} by ${(targetEntity as any).author}` : targetEntity.name,
          type: searchType,
          score: Math.round(score * 100) / 100,
          why,
        };
      });

      // Sort by score and take top 5
      const topMatches = matches
        .filter(m => m.score > 0.3) // Minimum threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return reply.send({
        success: true,
        data: { matches: topMatches },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: fromError(error).toString(),
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to find matches',
      });
    }
  });
}
