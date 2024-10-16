import { ChevronDownIcon, Equal, Grid2X2, X } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "react-use";
import { FORMBRICKS_SURVEYS_ORIENTATION_KEY_LS } from "@formbricks/lib/localStorage";
import { TProductConfigChannel } from "@formbricks/types/product";
import { TFilterOption, TSortOption, TSurveyFilters } from "@formbricks/types/surveys/types";
import { TTag } from "@formbricks/types/tags";
import { initialFilters } from "..";
import { Button } from "../../Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../DropdownMenu";
import { SearchBar } from "../../SearchBar";
import { TooltipRenderer } from "../../Tooltip";
import { SortOption } from "./SortOption";
import { SurveyFilterDropdown } from "./SurveyFilterDropdown";

interface SurveyFilterProps {
  orientation: string;
  setOrientation: (orientation: string) => void;
  surveyFilters: TSurveyFilters;
  setSurveyFilters: React.Dispatch<React.SetStateAction<TSurveyFilters>>;
  currentProductChannel: TProductConfigChannel;
  environmentTags: TTag[];
}

const creatorOptions: TFilterOption[] = [
  { label: "You", value: "you" },
  { label: "Others", value: "others" },
];

const statusOptions: TFilterOption[] = [
  { label: "In Progress", value: "inProgress" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Paused", value: "paused" },
  { label: "Completed", value: "completed" },
  { label: "Draft", value: "draft" },
];

const sortOptions: TSortOption[] = [
  {
    label: "Last Modified",
    value: "updatedAt",
  },
  {
    label: "Created On",
    value: "createdAt",
  },
  {
    label: "Alphabetical",
    value: "name",
  },
  {
    label: "Relevance",
    value: "relevance",
  },
];

const getToolTipContent = (orientation: string) => {
  return <div>{orientation} View</div>;
};

export const SurveyFilters = ({
  orientation,
  setOrientation,
  surveyFilters,
  setSurveyFilters,
  currentProductChannel,
  environmentTags,
}: SurveyFilterProps) => {
  const { createdBy, sortBy, status, type, tag } = surveyFilters;
  const [name, setName] = useState("");

  useDebounce(() => setSurveyFilters((prev) => ({ ...prev, name: name })), 800, [name]);

  const [dropdownOpenStates, setDropdownOpenStates] = useState(new Map());

  const typeOptions: TFilterOption[] = [
    { label: "Link", value: "link" },
    { label: "App", value: "app" },
    { label: "Website", value: "website" },
  ].filter((option) => {
    if (currentProductChannel === "website") {
      return option.value !== "app";
    } else if (currentProductChannel === "app") {
      return option.value !== "website";
    } else {
      return option;
    }
  });

  const toggleDropdown = (id: string) => {
    setDropdownOpenStates(new Map(dropdownOpenStates).set(id, !dropdownOpenStates.get(id)));
  };

  const handleCreatedByChange = (value: string) => {
    if (value === "you" || value === "others") {
      if (createdBy.includes(value)) {
        setSurveyFilters((prev) => ({ ...prev, createdBy: prev.createdBy.filter((v) => v !== value) }));
      } else {
        setSurveyFilters((prev) => ({ ...prev, createdBy: [...prev.createdBy, value] }));
      }
    }
  };

  const handleStatusChange = (value: string) => {
    if (
      value === "inProgress" ||
      value === "paused" ||
      value === "completed" ||
      value === "draft" ||
      value === "scheduled"
    ) {
      if (status.includes(value)) {
        setSurveyFilters((prev) => ({ ...prev, status: prev.status.filter((v) => v !== value) }));
      } else {
        setSurveyFilters((prev) => ({ ...prev, status: [...prev.status, value] }));
      }
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === "link" || value === "app") {
      if (type.includes(value)) {
        setSurveyFilters((prev) => ({ ...prev, type: prev.type.filter((v) => v !== value) }));
      } else {
        setSurveyFilters((prev) => ({ ...prev, type: [...prev.type, value] }));
      }
    }
  };

  const handleTagChange = (value: string) => {
    const isTagSelected = tag.map((t) => t.id).includes(value);

    const updatedTags = isTagSelected
      ? tag.filter((t) => t.id !== value)
      : [
          ...tag,
          environmentTags.find((t) => t.id === value) as {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            environmentId: string;
          },
        ];

    setSurveyFilters((prev) => ({ ...prev, tag: updatedTags }));
  };

  const handleSortChange = (option: TSortOption) => {
    setSurveyFilters((prev) => ({ ...prev, sortBy: option.value }));
  };

  const handleOrientationChange = (value: string) => {
    setOrientation(value);
    localStorage.setItem(FORMBRICKS_SURVEYS_ORIENTATION_KEY_LS, value);
  };

  return (
    <div className="flex justify-between">
      <div className="flex space-x-2">
        <SearchBar
          value={name}
          onChange={setName}
          placeholder={"Search by survey name"}
          className="border-slate-700"
        />
        <div>
          <SurveyFilterDropdown
            title="Tags"
            id="tags"
            options={environmentTags.map((tag) => ({ label: tag.name, value: tag.id }))}
            selectedOptions={tag.map((t) => t.id)}
            setSelectedOptions={handleTagChange}
            isOpen={dropdownOpenStates.get("tags")}
            toggleDropdown={toggleDropdown}
          />
        </div>
        <div>
          <SurveyFilterDropdown
            title="Created By"
            id="createdBy"
            options={creatorOptions}
            selectedOptions={createdBy}
            setSelectedOptions={handleCreatedByChange}
            isOpen={dropdownOpenStates.get("createdBy")}
            toggleDropdown={toggleDropdown}
          />
        </div>
        <div>
          <SurveyFilterDropdown
            title="Status"
            id="status"
            options={statusOptions}
            selectedOptions={status}
            setSelectedOptions={handleStatusChange}
            isOpen={dropdownOpenStates.get("status")}
            toggleDropdown={toggleDropdown}
          />
        </div>
        {currentProductChannel !== "link" && (
          <div>
            <SurveyFilterDropdown
              title="Type"
              id="type"
              options={typeOptions}
              selectedOptions={type}
              setSelectedOptions={handleTypeChange}
              isOpen={dropdownOpenStates.get("type")}
              toggleDropdown={toggleDropdown}
            />
          </div>
        )}

        {(createdBy.length > 0 || status.length > 0 || type.length > 0 || tag.length > 0) && (
          <Button
            size="sm"
            onClick={() => {
              setSurveyFilters(initialFilters);
              localStorage.removeItem("surveyFilters");
            }}
            className="h-8"
            EndIcon={X}
            endIconClassName="h-4 w-4">
            Clear Filters
          </Button>
        )}
      </div>
      <div className="flex space-x-2">
        <TooltipRenderer
          shouldRender={true}
          tooltipContent={getToolTipContent("List")}
          className="bg-slate-900 text-white">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border p-1 ${
              orientation === "list" ? "bg-slate-900 text-white" : "bg-white"
            }`}
            onClick={() => handleOrientationChange("list")}>
            <Equal className="h-5 w-5" />
          </div>
        </TooltipRenderer>

        <TooltipRenderer
          shouldRender={true}
          tooltipContent={getToolTipContent("Grid")}
          className="bg-slate-900 text-white">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border p-1 ${
              orientation === "grid" ? "bg-slate-900 text-white" : "bg-white"
            }`}
            onClick={() => handleOrientationChange("grid")}>
            <Grid2X2 className="h-5 w-5" />
          </div>
        </TooltipRenderer>

        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            className="surveyFilterDropdown h-full cursor-pointer border border-slate-700 outline-none hover:bg-slate-900">
            <div className="min-w-auto h-8 rounded-md border sm:flex sm:px-2">
              <div className="hidden w-full items-center justify-between hover:text-white sm:flex">
                <span className="text-sm">
                  Sort by: {sortOptions.find((option) => option.value === sortBy)?.label}
                </span>
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-slate-900">
            {sortOptions.map((option) => (
              <SortOption
                option={option}
                key={option.label}
                sortBy={surveyFilters.sortBy}
                handleSortChange={handleSortChange}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
