import { CheckCircleIcon } from "@heroicons/react/24/solid";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";

import { cn } from "@formbricks/lib/cn";
import { TEnvironment } from "@formbricks/types/environment";
import { TProduct } from "@formbricks/types/product";
import { TSurvey } from "@formbricks/types/surveys";
import { Input } from "@formbricks/ui/Input";
import { Label } from "@formbricks/ui/Label";
import { Select, SelectTrigger, SelectValue } from "@formbricks/ui/Select";
import { Switch } from "@formbricks/ui/Switch";

interface SurveyGeneralSettingsProps {
  localSurvey: TSurvey;
  setLocalSurvey: (survey: TSurvey | ((TSurvey) => TSurvey)) => void;
  environment: TEnvironment;
  product: TProduct;
}

export default function SurveyGeneralSettings({
  localSurvey,
  setLocalSurvey,
  product,
}: SurveyGeneralSettingsProps) {
  const [open, setOpen] = useState(false);
  const [customReward, setCustomReward] = useState(localSurvey.reward);
  const [usingCustomReward, setUsingCustomReward] = useState(
    localSurvey.reward !== product.defaultRewardInEuros
  );
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const toggleUsingDefaultReward = (isChecked) => {
    setUsingCustomReward(isChecked);
    setLocalSurvey({
      ...localSurvey,
      reward: isChecked ? customReward : product.defaultRewardInEuros,
    });
  };

  const updateSurveyReward = (e) => {
    let newValue = parseFloat(e.target.value);
    newValue = Math.min(Math.max(newValue, 0), 9.99);
    setCustomReward(newValue);
    setLocalSurvey({
      ...localSurvey,
      reward: newValue,
    });
  };

  // const languages = ["English", "Spanish", "French", "German"];

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={cn(
        open ? "" : "hover:bg-slate-50",
        "w-full space-y-2 rounded-lg border border-slate-300 bg-white "
      )}>
      <Collapsible.CollapsibleTrigger asChild className="h-full w-full cursor-pointer">
        <div className="inline-flex px-4 py-4">
          <div className="flex items-center pl-2 pr-5">
            <CheckCircleIcon className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Survey General Settings</p>
            <p className="mt-1 text-sm text-slate-500">Choose language, countries and reward for survey.</p>
          </div>
        </div>
      </Collapsible.CollapsibleTrigger>
      <Collapsible.CollapsibleContent>
        <hr className="py-1 text-slate-600" />
        <div className="p-3">
          <div className="p-3">
            <div className="ml-2 flex items-center space-x-1">
              <Label htmlFor="language" className="cursor-pointer">
                Select Survey Language:
              </Label>
              <Select
                value={selectedLanguage}
                onValueChange={(selectedLanguage) => setSelectedLanguage(selectedLanguage)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
              </Select>
            </div>
          </div>
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
              <div className="ml-2">
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
                  className="ml-2 mr-2 inline w-20 bg-white text-center text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </Collapsible.CollapsibleContent>
    </Collapsible.Root>
  );
}
