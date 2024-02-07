import SurveyDropDownMenu from "@/app/(app)/environments/[environmentId]/surveys/components/SurveyDropDownMenu";
import SurveyStarter from "@/app/(app)/environments/[environmentId]/surveys/components/SurveyStarter";
import { generateSurveySingleUseId } from "@/app/lib/singleUseSurveys";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { PlusIcon } from "@heroicons/react/24/solid";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@formbricks/lib/authOptions";
import { ITEMS_PER_PAGE, WEBAPP_URL } from "@formbricks/lib/constants";
import { getEnvironment, getEnvironments } from "@formbricks/lib/environment/service";
import { getMembershipByUserIdTeamId } from "@formbricks/lib/membership/service";
import { getAccessFlags } from "@formbricks/lib/membership/utils";
import { getProductByEnvironmentId } from "@formbricks/lib/product/service";
import { getSurveys, getSurveysCount } from "@formbricks/lib/survey/service";
import { getTeamByEnvironmentId } from "@formbricks/lib/team/service";
import type { TEnvironment } from "@formbricks/types/environment";
import { Button } from "@formbricks/ui/Button";
import { Pagination } from "@formbricks/ui/Pagination";
import { SurveyStatusIndicator } from "@formbricks/ui/SurveyStatusIndicator";

interface SurveysPageParams {
  environmentId: string;
  searchParams: { [key: string]: string | undefined };
}

export default async function SurveyTable({ environmentId, searchParams }: SurveysPageParams) {
  const pageNumber = searchParams.page ? parseInt(searchParams.page as string) : 1;

  const totalSurveys = await getSurveysCount(environmentId);

  const session = await getServerSession(authOptions);
  const product = await getProductByEnvironmentId(environmentId);
  const team = await getTeamByEnvironmentId(environmentId);

  if (!session) {
    throw new Error("Session not found");
  }

  if (!product) {
    throw new Error("Product not found");
  }

  if (!team) {
    throw new Error("Team not found");
  }

  const currentUserMembership = await getMembershipByUserIdTeamId(session?.user.id, team.id);
  const { isViewer } = getAccessFlags(currentUserMembership?.role);
  const isSurveyCreationDeletionDisabled = isViewer;

  const environment = await getEnvironment(environmentId);
  if (!environment) {
    throw new Error("Environment not found");
  }
  const surveys = await getSurveys(environmentId, pageNumber);

  const environments: TEnvironment[] = await getEnvironments(product.id);
  const otherEnvironment = environments.find((e) => e.type !== environment.type)!;

  if (surveys.length === 0) {
    return (
      <SurveyStarter
        environmentId={environmentId}
        environment={environment}
        product={product}
        user={session.user}
      />
    );
  }

  return (
    <>
      <div className="flex justify-between">
        <form className="w-3/5">
          <label
            htmlFor="default-search"
            className="sr-only mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Search
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <MagnifyingGlassIcon className="h-6 w-6 text-gray-500" />
            </div>
            <input
              type="search"
              id="default-search"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-4 ps-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              placeholder="Search Surveys..."
            />
            <Button
              type="submit"
              className="bg-brand-dark hover:bg-brand absolute bottom-2.5 end-2.5 rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-4 focus:ring-blue-300">
              Search
            </Button>
          </div>
        </form>

        <div className="mb-6 text-right">
          <div className="mb-6 flex items-center justify-end text-right">
            <Button variant="primary" href={`/environments/${environmentId}/surveys/templates`}>
              <PlusIcon className="mr-2 h-6 w-6" />
              Create Survey
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200">
        <div className="grid h-12 grid-cols-7 content-center rounded-lg bg-slate-100 text-left text-sm font-semibold text-slate-900">
          <div className="col-span-3 pl-6 ">Survey</div>
          <div className="col-span-2 hidden text-center sm:block">Status</div>
          <div className="col-span-2 hidden text-center sm:block"></div>
        </div>
        {surveys
          .sort((a, b) => b.updatedAt?.getTime() - a.updatedAt?.getTime())
          .map((survey) => {
            const isSingleUse = survey.singleUse?.enabled ?? false;
            const isEncrypted = survey.singleUse?.isEncrypted ?? false;
            const singleUseId = isSingleUse ? generateSurveySingleUseId(isEncrypted) : undefined;

            return (
              <div className="m-2 grid h-16  grid-cols-7 content-center rounded-lg hover:bg-slate-100">
                <Link
                  href={
                    survey.status === "draft"
                      ? `/environments/${environmentId}/surveys/${survey.id}/edit`
                      : `/environments/${environmentId}/surveys/${survey.id}/summary`
                  }
                  key={survey.id}
                  className="col-span-3 flex items-center pl-6 text-sm">
                  <div className="ph-no-capture font-medium text-slate-900">{survey.name}</div>
                </Link>

                <div className="col-span-2 my-auto hidden whitespace-nowrap text-center text-sm text-slate-500 sm:block">
                  <div className="ph-no-capture text-slate-900">
                    <div className="flex justify-center">
                      {survey.status !== "draft" && (
                        <>
                          {(survey.type === "link" || environment.widgetSetupCompleted) && (
                            <SurveyStatusIndicator status={survey.status} />
                          )}
                        </>
                      )}
                      {survey.status === "draft" && (
                        <span className="text-xs italic text-slate-400">Draft</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 my-auto hidden whitespace-nowrap text-center text-sm text-slate-500 sm:block">
                  <div className="ph-no-capture text-slate-900">
                    <div className="mr-5 flex justify-end">
                      <SurveyDropDownMenu
                        survey={survey}
                        key={`surveys-${survey.id}`}
                        environmentId={environmentId}
                        environment={environment}
                        otherEnvironment={otherEnvironment!}
                        webAppUrl={WEBAPP_URL}
                        singleUseId={singleUseId}
                        isSurveyCreationDeletionDisabled={isSurveyCreationDeletionDisabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <Pagination
        baseUrl={`/environments/${environmentId}/surveys`}
        currentPage={pageNumber}
        totalItems={totalSurveys}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </>
  );
}
