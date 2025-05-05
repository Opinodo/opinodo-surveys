import { getAllCountries } from "@/app/(app)/environments/[environmentId]/actions";
import { cn } from "@/lib/cn";
import { getTagsForSurveyAction } from "@/modules/survey/list/actions";
import { SurveyTagsWrapper } from "@/modules/survey/list/components/survey-tags-wrapper";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";
import { Switch } from "@/modules/ui/components/switch";
import { Project } from "@prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Select from "react-select";
import { TSurvey } from "@formbricks/types/surveys/types";
import { TTag } from "@formbricks/types/tags";

interface SurveyGeneralSettingsProps {
  localSurvey: TSurvey;
  setLocalSurvey: (survey: TSurvey | ((s: TSurvey) => TSurvey)) => void;
  project: Project;
  environmentTags: TTag[];
  environmentId: string;
}

export function SurveyGeneralSettings({
  localSurvey,
  setLocalSurvey,
  project,
  environmentTags,
  environmentId,
}: SurveyGeneralSettingsProps) {
  const [open, setOpen] = useState(true);
  const [customReward, setCustomReward] = useState(localSurvey.reward);
  const [usingCustomReward, setUsingCustomReward] = useState(
    localSurvey.reward !== project.defaultRewardInUSD
  );
  const [timerEnabled, setTimerEnabled] = useState(
    localSurvey.timerDuration !== null && localSurvey.timerDuration !== undefined
  );
  const [timerDuration, setTimerDuration] = useState<number | undefined>(
    localSurvey.timerDuration ?? undefined
  );
  const [priority, setPriority] = useState<number>(localSurvey.priority ?? 0);

  const toggleUsingDefaultReward = (isChecked: boolean) => {
    setUsingCustomReward(isChecked);
    setLocalSurvey({
      ...localSurvey,
      reward: isChecked ? customReward : project.defaultRewardInUSD,
    });
  };

  const updateSurveyReward = (e) => {
    let newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) newValue = 0;
    newValue = Math.min(Math.max(newValue, 0), 20);
    setCustomReward(newValue);
    setLocalSurvey({
      ...localSurvey,
      reward: newValue,
    });
  };

  const updatePriority = (e) => {
    let newValue = parseInt(e.target.value, 10);
    if (isNaN(newValue)) newValue = 0;
    setPriority(newValue);
    setLocalSurvey({
      ...localSurvey,
      priority: newValue,
    });
  };

  const toggleTimerEnabled = (isChecked: boolean) => {
    setTimerEnabled(isChecked);
    setLocalSurvey({
      ...localSurvey,
      timerDuration: isChecked ? (timerDuration ?? 180) : null,
    });
    if (isChecked && (timerDuration === undefined || timerDuration === null)) {
      setTimerDuration(180); // Set a default value if timerDuration is undefined or null
    }
  };

  const updateTimerDuration = (e) => {
    let newValue = parseInt(e.target.value, 10);
    if (isNaN(newValue) || newValue <= 0) newValue = 1;
    setTimerDuration(newValue);
    setLocalSurvey({
      ...localSurvey,
      timerDuration: newValue,
    });
  };

  interface Country {
    name: string;
    isoCode: string;
  }

  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    const fetchCountries = async () => {
      const countriesData = await getAllCountries();
      setCountries(countriesData);
    };

    fetchCountries();
    updateFetchedSurveys();
  }, []);

  const handleCountryChange = (selectedCountries) => {
    const updatedCountries = selectedCountries.map((country) => ({
      isoCode: country.value,
      name: country.label,
    }));

    setLocalSurvey((prevState) => ({
      ...prevState,
      countries: updatedCountries,
      limitedCountries: updatedCountries.length > 0,
    }));
  };

  const updateFetchedSurveys = async () => {
    const fetchedTags = await getTagsForSurveyAction({ surveyId: localSurvey.id });
    setLocalSurvey((prevState) => ({
      ...prevState,
      tags: fetchedTags?.data ?? [],
    }));
  };

  const [limitedToCountries, setLimitedToCountries] = useState(localSurvey.countries.length > 0);

  const toggleLimitedToCountries = (isChecked) => {
    setLimitedToCountries(isChecked);
    const newCountries = !isChecked ? [] : localSurvey.countries;
    setLocalSurvey((prevState) => ({
      ...prevState,
      countries: newCountries,
      limitedCountries: newCountries.length > 0,
    }));
  };

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={cn(
        open ? "" : "hover:bg-slate-50",
        "w-full space-y-2 rounded-lg border border-slate-300 bg-white"
      )}>
      <Collapsible.CollapsibleTrigger asChild className="h-full w-full cursor-pointer">
        <div className="inline-flex px-4 py-4">
          <div className="flex items-center pr-5 pl-2">
            <CheckIcon
              strokeWidth={3}
              className="h-7 w-7 rounded-full border border-green-300 bg-green-100 p-1.5 text-green-600"
            />{" "}
          </div>
          <div>
            <p className="font-semibold text-slate-800">Survey General Settings</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose language, countries, reward, priority, and timer settings for survey.
            </p>
          </div>
        </div>
      </Collapsible.CollapsibleTrigger>
      <Collapsible.CollapsibleContent>
        <hr className="py-1 text-slate-600" />
        <div className="p-3">
          <div className="p-3">
            <div className="ml-2 flex items-center space-x-1">
              <Switch
                id="customReward"
                checked={usingCustomReward}
                onCheckedChange={toggleUsingDefaultReward}
              />
              <Label htmlFor="customReward" className="cursor-pointer">
                <div className="ml-2">
                  <h3 className="text-sm font-semibold text-slate-700">Use Custom Reward</h3>
                  <p className="text-xs font-normal text-slate-500">Change the reward for this survey.</p>
                </div>
              </Label>
            </div>
            {usingCustomReward && (
              <div className="mt-2 ml-2">
                <Label htmlFor="customRewardInput" className="cursor-pointer">
                  Custom Reward:
                </Label>
                <Input
                  autoFocus
                  type="number"
                  id="customRewardInput"
                  step="0.1"
                  onChange={updateSurveyReward}
                  value={customReward}
                  className="mr-2 ml-2 inline w-20 bg-white text-center text-sm"
                />
                <Label htmlFor="dollarSymbol" className="cursor-pointer">
                  $
                </Label>
              </div>
            )}
          </div>

          {/* Priority Setting */}
          <div className="p-3">
            <div className="ml-2">
              <Label htmlFor="priorityInput" className="block text-sm font-semibold text-slate-700">
                Survey Priority:
              </Label>
              <p className="mb-2 text-xs font-normal text-slate-500">
                Set the priority of this survey. Higher values mean higher priority.
              </p>
              <Input
                type="number"
                id="priorityInput"
                step="1"
                onChange={updatePriority}
                value={priority}
                className="w-24 bg-white text-center text-sm"
              />
            </div>
          </div>

          <div className="p-3">
            <div className="ml-2 flex items-center space-x-1">
              <Switch
                id="limitedToCountries"
                checked={limitedToCountries}
                onCheckedChange={toggleLimitedToCountries}
              />
              <Label htmlFor="countries" className="cursor-pointer">
                <div className="ml-2">
                  <h3 className="text-sm font-semibold text-slate-700">Limit to Countries</h3>
                  <p className="text-xs font-normal text-slate-500">
                    Make the survey available only to certain countries.
                  </p>
                </div>
              </Label>
            </div>
            {limitedToCountries && (
              <div className="mt-4">
                {" "}
                {/* Add margin-top to create space */}
                <Select
                  options={countries.map((country) => ({
                    value: country.isoCode,
                    label: country.name,
                  }))}
                  isMulti
                  isSearchable
                  onChange={handleCountryChange}
                  value={localSurvey.countries.map((country) => ({
                    value: country.isoCode,
                    label: country.name,
                  }))}
                />
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="ml-2 flex items-center space-x-1">
              <Switch id="timerEnabled" checked={timerEnabled} onCheckedChange={toggleTimerEnabled} />
              <Label htmlFor="timerEnabled" className="cursor-pointer">
                <div className="ml-2">
                  <h3 className="text-sm font-semibold text-slate-700">Enable Timer</h3>
                  <p className="text-xs font-normal text-slate-500">Enable or disable the survey timer.</p>
                </div>
              </Label>
            </div>
            {timerEnabled && (
              <div className="mt-2 ml-2">
                <Label htmlFor="timerDurationInput" className="cursor-pointer">
                  Timer Duration (seconds):
                </Label>
                <Input
                  autoFocus
                  type="number"
                  id="timerDurationInput"
                  step="1"
                  min="1"
                  onChange={updateTimerDuration}
                  value={timerDuration}
                  className="mr-2 ml-2 inline w-20 bg-white text-center text-sm"
                />
              </div>
            )}
          </div>
          <div className="p-3">
            <SurveyTagsWrapper
              environmentId={environmentId}
              surveyId={localSurvey.id}
              tags={localSurvey.tags.map((tag) => ({
                tagId: tag.id,
                tagName: tag.name,
              }))}
              environmentTags={environmentTags}
              updateFetchedSurveys={updateFetchedSurveys}
              isViewer={false}
            />
          </div>
        </div>
      </Collapsible.CollapsibleContent>
    </Collapsible.Root>
  );
}
