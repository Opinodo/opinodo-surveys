import { authenticateRequest } from "@/app/api/v1/auth";
import { responses } from "@/app/lib/api/response";
import { prisma } from "@formbricks/database";
import { logger } from "@formbricks/logger";

/**
 * Truncates responses table by executing direct SQL truncate command
 * This is faster than using Prisma's delete operations for large tables
 * Warning: This will delete ALL data in the responses table and related tables
 */
export async function POST(request: Request) {
  const authentication = await authenticateRequest(request);
  if (!authentication) return responses.notAuthenticatedResponse();

  try {
    logger.info("Starting response table truncation process");

    // Use raw SQL for much faster truncation
    await prisma.$transaction([
      // First clear dependent tables with foreign keys
      prisma.$executeRawUnsafe('TRUNCATE TABLE "ResponseNote" CASCADE'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "TagsOnResponses" CASCADE'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "Document" CASCADE'),
      // Then truncate the responses table itself
      prisma.$executeRawUnsafe('TRUNCATE TABLE "Response" CASCADE'),
    ]);

    logger.info("Response tables truncated successfully");

    return responses.successResponse({
      message: "Response tables truncated successfully",
    });
  } catch (error) {
    logger.error("Error truncating response tables", { error });
    return responses.internalServerErrorResponse("Error truncating response tables", error);
  }
}
