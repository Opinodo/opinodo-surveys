import { headers } from "next/headers";
import { prisma } from "@formbricks/database";
import { logger } from "@formbricks/logger";
import { responses } from "@/app/lib/api/response";
import { CRON_SECRET } from "@/lib/constants";

/**
 * Truncates responses table by executing direct SQL truncate command
 * This version is specifically for cron job usage with CRON_SECRET authentication
 * Warning: This will delete ALL data in the responses table and related tables
 */
export async function POST() {
  const headersList = await headers();
  const apiKey = headersList.get("x-api-key");

  if (!apiKey || apiKey !== CRON_SECRET) {
    return responses.notAuthenticatedResponse();
  }

  try {
    logger.info("Starting response table truncation process from cron job");

    // Use raw SQL for much faster truncation
    await prisma.$transaction([
      // First clear dependent tables with foreign keys
      prisma.$executeRawUnsafe('TRUNCATE TABLE "ResponseNote" CASCADE'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "TagsOnResponses" CASCADE'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "Document" CASCADE'),
      // Then truncate the responses table itself
      prisma.$executeRawUnsafe('TRUNCATE TABLE "Response" CASCADE'),
    ]);

    logger.info("Response tables truncated successfully from cron job");

    return responses.successResponse({
      message: "Response tables truncated successfully from cron job",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? (error.stack ?? error.message) : JSON.stringify(error);
    logger.error(`Error truncating response tables from cron job: ${errMsg}`);
    return responses.internalServerErrorResponse("Error truncating response tables from cron job", error);
  }
}
