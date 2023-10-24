import { z } from "zod";
import { eventCreateSchema } from "~/utils/validation/event";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";
import s3 from "~/server/s3";
import { db } from "~/server/db";
export const eventRouter = createTRPCRouter({
  createEvent: protectedProcedure
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await db.event.create({
        data: {
          name: input.name,
          createdBy: { connect: { id: ctx.session.user.id } },
          resolutedAt: input.resolutedAt,
          resolutionDetails: input.resolutionDetails,
          imageUrl: env.S3_PUBLIC_URL + "/" + input.fileName,
        },
      });
      return result;
    }),
  getPresignedUrl: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const fileName = `${ctx.session.user.id}/${Date.now()}.jpeg`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: fileName,
          ContentType: "image/jpeg",
          ACL: "public-read",
        }),
        { expiresIn: 3600 },
      );
      return { url, fileName };
    }),
});
