import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import {
  searchBooks,
  searchClubs,
  searchPitches,
  getTrendingBooks,
  getTrendingClubs,
  getTrendingPitches,
  incrementPitchImpressions,
} from '../lib/search.js';

export async function discoverRoutes(fastify: FastifyInstance) {
  // Search books
  fastify.get<{
    Querystring: {
      q?: string;
      genres?: string;
      isAvailable?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/discover/books', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query.q || '';
      const genres = request.query.genres ? request.query.genres.split(',') : undefined;
      const isAvailable =
        request.query.isAvailable !== undefined
          ? request.query.isAvailable === 'true'
          : undefined;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const result = await searchBooks(
        query,
        {
          genres,
          isAvailable,
        },
        limit,
        offset
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to search books',
      });
    }
  });

  // Search clubs
  fastify.get<{
    Querystring: {
      q?: string;
      genres?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/discover/clubs', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query.q || '';
      const genres = request.query.genres ? request.query.genres.split(',') : undefined;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const result = await searchClubs(
        query,
        {
          genres,
        },
        limit,
        offset
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to search clubs',
      });
    }
  });

  // Search pitches
  fastify.get<{
    Querystring: {
      q?: string;
      status?: string;
      authorId?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/discover/pitches', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query.q || '';
      const status = request.query.status;
      const authorId = request.query.authorId;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const result = await searchPitches(
        query,
        {
          status,
          authorId,
        },
        limit,
        offset
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to search pitches',
      });
    }
  });

  // Get trending books
  fastify.get<{
    Querystring: { limit?: string };
  }>('/api/discover/trending/books', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
      const books = await getTrendingBooks(limit);

      return reply.send({
        success: true,
        data: books,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get trending books',
      });
    }
  });

  // Get trending clubs
  fastify.get<{
    Querystring: { limit?: string };
  }>('/api/discover/trending/clubs', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
      const clubs = await getTrendingClubs(limit);

      return reply.send({
        success: true,
        data: clubs,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get trending clubs',
      });
    }
  });

  // Get trending pitches
  fastify.get<{
    Querystring: { limit?: string };
  }>('/api/discover/trending/pitches', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
      const pitches = await getTrendingPitches(limit);

      return reply.send({
        success: true,
        data: pitches,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get trending pitches',
      });
    }
  });

  // Track pitch impression
  fastify.post<{
    Params: { id: string };
  }>('/api/discover/pitches/:id/impression', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const pitchId = request.params.id;
      await incrementPitchImpressions(pitchId);

      return reply.send({
        success: true,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to track impression',
      });
    }
  });
}
