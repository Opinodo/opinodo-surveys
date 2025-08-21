"use client";

import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { TagError } from "@/modules/projects/settings/types/tag";
import { Button } from "@/modules/ui/components/button";
import { Tag } from "@/modules/ui/components/tag";
import { TagsCombobox } from "@/modules/ui/components/tags-combobox";
import { AlertCircleIcon, SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { TTag } from "@formbricks/types/tags";
import {
  createTagAction,
  createTagToSurveyAction,
  deleteTagOnSurveyAction,
  getTagsForSurveyAction,
} from "../actions";

interface SurveyTagsWrapperProps {
  tags: {
    tagId: string;
    tagName: string;
  }[];
  environmentId: string;
  surveyId: string;
  environmentTags: TTag[];
  updateFetchedSurveys: () => void;
  isViewer?: boolean;
}

export const SurveyTagsWrapper: React.FC<SurveyTagsWrapperProps> = ({
  tags,
  environmentId,
  surveyId,
  environmentTags,
  updateFetchedSurveys,
  isViewer,
}) => {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = React.useState(false);
  const [tagsState, setTagsState] = useState(tags);
  const [tagIdToHighlight, setTagIdToHighlight] = useState("");

  const onDelete = async (tagId: string) => {
    try {
      await deleteTagOnSurveyAction({ surveyId, tagId });
      updateFetchedSurveys();
    } catch (e) {
      toast.error("An error occurred deleting the tag");
    }
  };

  const handleCreateTag = async (tagName: string) => {
    setOpen(false);

    const createTagResponse = await createTagAction({
      environmentId,
      tagName: tagName?.trim() ?? "",
    });

    if (createTagResponse?.data?.ok) {
      const tag = createTagResponse.data.data;
      setTagsState((prevTags) => [
        ...prevTags,
        {
          tagId: tag.id,
          tagName: tag.name,
        },
      ]);

      const createTagToSurveyActionResponse = await createTagToSurveyAction({
        surveyId,
        tagId: tag.id,
      });

      if (createTagToSurveyActionResponse?.data) {
        updateFetchedSurveys();
        setSearchValue("");
        setTagIdToHighlight(tag.id);
      } else {
        const errorMessage = getFormattedErrorMessage(createTagToSurveyActionResponse);
        toast.error(errorMessage || "Failed to add tag to survey", {
          duration: 2000,
        });
      }

      return;
    }

    if (
      createTagResponse?.data?.ok === false &&
      createTagResponse?.data?.error?.code === TagError.TAG_NAME_ALREADY_EXISTS
    ) {
      toast.error("Tag already exists", {
        duration: 2000,
        icon: <AlertCircleIcon className="h-5 w-5 text-orange-500" />,
      });

      setSearchValue("");
      return;
    }

    const errorMessage = getFormattedErrorMessage(createTagResponse);
    toast.error(errorMessage ?? "Something went wrong", {
      duration: 2000,
    });
    setSearchValue("");
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const fetchedTags = await getTagsForSurveyAction({ surveyId });
        if (fetchedTags && fetchedTags.data) {
          setTagsState(fetchedTags.data.map((tag) => ({ tagId: tag.id, tagName: tag.name })));
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();
  }, [surveyId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tagIdToHighlight) {
        setTagIdToHighlight("");
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [tagIdToHighlight]);

  return (
    <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4">
      {!isViewer && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer p-0"
          onClick={() => {
            router.push(`/environments/${environmentId}/product/tags`);
          }}>
          <SettingsIcon className="h-5 w-5 text-slate-500 hover:text-slate-600" />
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {tagsState?.map((tag) => (
          <Tag
            key={tag.tagId}
            onDelete={onDelete}
            tagId={tag.tagId}
            tagName={tag.tagName}
            tags={tagsState}
            setTagsState={setTagsState}
            highlight={tagIdToHighlight === tag.tagId}
            allowDelete={!isViewer}
          />
        ))}

        {!isViewer && (
          <TagsCombobox
            open={open}
            setOpen={setOpen}
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            tags={environmentTags?.map((tag) => ({ value: tag.id, label: tag.name })) ?? []}
            currentTags={tagsState.map((tag) => ({ value: tag.tagId, label: tag.tagName }))}
            createTag={handleCreateTag}
            addTag={async (tagId) => {
              setTagsState((prevTags) => [
                ...prevTags,
                {
                  tagId,
                  tagName: environmentTags?.find((tag) => tag.id === tagId)?.name ?? "",
                },
              ]);

              try {
                const result = await createTagToSurveyAction({ surveyId, tagId });
                if (result?.data) {
                  updateFetchedSurveys();
                  setSearchValue("");
                  setOpen(false);
                  setTagIdToHighlight(tagId);
                } else {
                  const errorMessage = getFormattedErrorMessage(result);
                  toast.error(errorMessage || "Failed to add tag to survey", {
                    duration: 2000,
                  });
                }
              } catch (error) {
                toast.error("An error occurred while adding the tag", {
                  duration: 2000,
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
