"use server";

import { createTag, getTagsBySurveyId } from "@/lib/tag/service";
import { addTagToSurvey, deleteTagOnSurvey } from "@/lib/tagOnSurvey/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { AuthenticatedActionClientCtx } from "@/lib/utils/action-client/types/context";
import {
  getOrganizationIdFromEnvironmentId,
  getOrganizationIdFromSurveyId,
  getOrganizationIdFromTagId,
  getProjectIdFromEnvironmentId,
  getProjectIdFromSurveyId,
} from "@/lib/utils/helper";
import { generateSurveySingleUseId } from "@/lib/utils/single-use-surveys";
import { withAuditLogging } from "@/modules/ee/audit-logs/lib/handler";
import { getProjectIdIfEnvironmentExists } from "@/modules/survey/list/lib/environment";
import {
  copySurveyToOtherEnvironment,
  deleteSurvey,
  getSurvey,
  getSurveys,
} from "@/modules/survey/list/lib/survey";
import { z } from "zod";
import { ZId } from "@formbricks/types/common";
import { ResourceNotFoundError } from "@formbricks/types/errors";
import { ZSurveyFilterCriteria } from "@formbricks/types/surveys/types";
import { getUserProjects } from "./lib/project";

const ZGetSurveyAction = z.object({
  surveyId: z.string().cuid2(),
});

export const getSurveyAction = authenticatedActionClient
  .schema(ZGetSurveyAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromSurveyId(parsedInput.surveyId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "read",
          projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
        },
      ],
    });

    return await getSurvey(parsedInput.surveyId);
  });

const ZCopySurveyToOtherEnvironmentAction = z.object({
  environmentId: z.string().cuid2(),
  surveyId: z.string().cuid2(),
  targetEnvironmentId: z.string().cuid2(),
});

export const copySurveyToOtherEnvironmentAction = authenticatedActionClient
  .schema(ZCopySurveyToOtherEnvironmentAction)
  .action(
    withAuditLogging(
      "copiedToOtherEnvironment",
      "survey",
      async ({
        ctx,
        parsedInput,
      }: {
        ctx: AuthenticatedActionClientCtx;
        parsedInput: Record<string, any>;
      }) => {
        const sourceEnvironmentProjectId = await getProjectIdIfEnvironmentExists(parsedInput.environmentId);
        const targetEnvironmentProjectId = await getProjectIdIfEnvironmentExists(
          parsedInput.targetEnvironmentId
        );

        if (!sourceEnvironmentProjectId || !targetEnvironmentProjectId) {
          throw new ResourceNotFoundError(
            "Environment",
            sourceEnvironmentProjectId ? parsedInput.targetEnvironmentId : parsedInput.environmentId
          );
        }

        await checkAuthorizationUpdated({
          userId: ctx.user.id,
          organizationId: await getOrganizationIdFromEnvironmentId(parsedInput.environmentId),
          access: [
            {
              type: "organization",
              roles: ["owner", "manager"],
            },
            {
              type: "projectTeam",
              minPermission: "readWrite",
              projectId: sourceEnvironmentProjectId,
            },
          ],
        });

        await checkAuthorizationUpdated({
          userId: ctx.user.id,
          organizationId: await getOrganizationIdFromEnvironmentId(parsedInput.environmentId),
          access: [
            {
              type: "organization",
              roles: ["owner", "manager"],
            },
            {
              type: "projectTeam",
              minPermission: "readWrite",
              projectId: targetEnvironmentProjectId,
            },
          ],
        });

        ctx.auditLoggingCtx.organizationId = await getOrganizationIdFromEnvironmentId(
          parsedInput.environmentId
        );
        ctx.auditLoggingCtx.surveyId = parsedInput.surveyId;
        const result = await copySurveyToOtherEnvironment(
          parsedInput.environmentId,
          parsedInput.surveyId,
          parsedInput.targetEnvironmentId,
          ctx.user.id
        );
        ctx.auditLoggingCtx.newObject = result;
        return result;
      }
    )
  );

const ZGetProjectsByEnvironmentIdAction = z.object({
  environmentId: z.string().cuid2(),
});

export const getProjectsByEnvironmentIdAction = authenticatedActionClient
  .schema(ZGetProjectsByEnvironmentIdAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: organizationId,
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    return await getUserProjects(ctx.user.id, organizationId);
  });

const ZDeleteSurveyAction = z.object({
  surveyId: z.string().cuid2(),
});

export const deleteSurveyAction = authenticatedActionClient.schema(ZDeleteSurveyAction).action(
  withAuditLogging(
    "deleted",
    "survey",
    async ({ ctx, parsedInput }: { ctx: AuthenticatedActionClientCtx; parsedInput: Record<string, any> }) => {
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId: await getOrganizationIdFromSurveyId(parsedInput.surveyId),
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
          {
            type: "projectTeam",
            projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
            minPermission: "readWrite",
          },
        ],
      });

      ctx.auditLoggingCtx.organizationId = await getOrganizationIdFromSurveyId(parsedInput.surveyId);
      ctx.auditLoggingCtx.surveyId = parsedInput.surveyId;
      ctx.auditLoggingCtx.oldObject = await getSurvey(parsedInput.surveyId);
      return await deleteSurvey(parsedInput.surveyId);
    }
  )
);

const ZGenerateSingleUseIdAction = z.object({
  surveyId: z.string().cuid2(),
  isEncrypted: z.boolean(),
});

export const generateSingleUseIdAction = authenticatedActionClient
  .schema(ZGenerateSingleUseIdAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromSurveyId(parsedInput.surveyId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
          minPermission: "readWrite",
        },
      ],
    });

    return generateSurveySingleUseId(parsedInput.isEncrypted);
  });

const ZGetSurveysAction = z.object({
  environmentId: z.string().cuid2(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  filterCriteria: ZSurveyFilterCriteria.optional(),
});

export const getSurveysAction = authenticatedActionClient
  .schema(ZGetSurveysAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromEnvironmentId(parsedInput.environmentId),
      access: [
        {
          data: parsedInput.filterCriteria,
          schema: ZSurveyFilterCriteria,
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "read",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    return await getSurveys(
      parsedInput.environmentId,
      parsedInput.limit,
      parsedInput.offset,
      parsedInput.filterCriteria
    );
  });

const ZCreateTagAction = z.object({
  environmentId: ZId,
  tagName: z.string(),
});

export const createTagAction = authenticatedActionClient
  .schema(ZCreateTagAction)
  .action(async ({ parsedInput, ctx }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromEnvironmentId(parsedInput.environmentId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
          minPermission: "readWrite",
        },
      ],
    });

    return await createTag(parsedInput.environmentId, parsedInput.tagName);
  });

const ZCreateTagToSurveyAction = z.object({
  surveyId: ZId,
  tagId: ZId,
});

export const createTagToSurveyAction = authenticatedActionClient
  .schema(ZCreateTagToSurveyAction)
  .action(async ({ parsedInput, ctx }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromSurveyId(parsedInput.surveyId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
          minPermission: "readWrite",
        },
      ],
    });

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromTagId(parsedInput.tagId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
          minPermission: "readWrite",
        },
      ],
    });

    const result = await addTagToSurvey(parsedInput.surveyId, parsedInput.tagId);

    return result;
  });

const ZGetTagsForSurveyAction = z.object({
  surveyId: z.string(),
});

const ZDeleteTagOnSurveyAction = z.object({
  surveyId: ZId,
  tagId: ZId,
});

export const deleteTagOnSurveyAction = authenticatedActionClient
  .schema(ZDeleteTagOnSurveyAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromSurveyId(parsedInput.surveyId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
          minPermission: "readWrite",
        },
      ],
    });

    return await deleteTagOnSurvey(parsedInput.surveyId, parsedInput.tagId);
  });

export const getTagsForSurveyAction = authenticatedActionClient
  .schema(ZGetTagsForSurveyAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromSurveyId(parsedInput.surveyId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
          minPermission: "readWrite",
        },
      ],
    });

    return await getTagsBySurveyId(parsedInput.surveyId);
  });
