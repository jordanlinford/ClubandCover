import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export default async function pitchNominationsRoutes(app: FastifyInstance) {
  // Toggle nomination (add or remove)
  app.post(
    '/api/pitches/:pitchId/nominate',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user!.id;

      const paramsSchema = z.object({
        pitchId: z.string().uuid(),
      });

      const params = paramsSchema.parse(request.params);

      // Check if pitch exists
      const pitch = await prisma.pitch.findUnique({
        where: { id: params.pitchId },
        include: { targetClub: true },
      });

      if (!pitch) {
        return reply.code(404).send({
          success: false,
          error: 'Pitch not found',
        });
      }

      // Check if user is a member of the target club (if pitch has one)
      if (pitch.targetClubId) {
        const membership = await prisma.membership.findUnique({
          where: {
            clubId_userId: {
              clubId: pitch.targetClubId,
              userId,
            },
          },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          return reply.code(403).send({
            success: false,
            error: 'You must be an active member of the club to nominate pitches',
          });
        }
      }

      // Check if user already nominated this pitch
      const existingNomination = await prisma.pitchNomination.findUnique({
        where: {
          pitchId_userId: {
            pitchId: params.pitchId,
            userId,
          },
        },
      });

      let nominated = false;

      if (existingNomination) {
        // Remove nomination
        await prisma.pitchNomination.delete({
          where: { id: existingNomination.id },
        });
        nominated = false;
      } else {
        // Add nomination
        await prisma.pitchNomination.create({
          data: {
            pitchId: params.pitchId,
            userId,
          },
        });
        nominated = true;
      }

      // Get updated nomination count
      const nominationCount = await prisma.pitchNomination.count({
        where: { pitchId: params.pitchId },
      });

      return reply.send({
        success: true,
        data: {
          nominated,
          nominationCount,
        },
      });
    }
  );

  // Get nomination status and count for a pitch
  app.get('/api/pitches/:pitchId/nominations', async (request, reply) => {
    const paramsSchema = z.object({
      pitchId: z.string().uuid(),
    });

    const params = paramsSchema.parse(request.params);

    const nominationCount = await prisma.pitchNomination.count({
      where: { pitchId: params.pitchId },
    });

    // Check if current user has nominated (if authenticated)
    let userNominated = false;
    if (request.user) {
      const nomination = await prisma.pitchNomination.findUnique({
        where: {
          pitchId_userId: {
            pitchId: params.pitchId,
            userId: request.user.id,
          },
        },
      });
      userNominated = !!nomination;
    }

    return reply.send({
      success: true,
      data: {
        count: nominationCount,
        userNominated,
      },
    });
  });
}
