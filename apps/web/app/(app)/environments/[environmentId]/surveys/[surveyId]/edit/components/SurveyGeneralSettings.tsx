import { CheckCircleIcon } from "@heroicons/react/24/solid";
import * as Collapsible from "@radix-ui/react-collapsible";
import iso6391 from "iso-639-1";
import { useEffect, useState } from "react";
import Select from "react-select";

import { cn } from "@formbricks/lib/cn";
import { TEnvironment } from "@formbricks/types/environment";
import { TProduct } from "@formbricks/types/product";
import { TSurvey } from "@formbricks/types/surveys";
import { AdvancedOptionToggle } from "@formbricks/ui/AdvancedOptionToggle";
import { Input } from "@formbricks/ui/Input";
import { Label } from "@formbricks/ui/Label";
import {
  Select as FormbricksSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@formbricks/ui/Select";
import { Switch } from "@formbricks/ui/Switch";

import { getAllCountries } from "../../../../actions";

interface SurveyGeneralSettingsProps {
  localSurvey: TSurvey;
  setLocalSurvey: (survey: TSurvey | ((s: TSurvey) => TSurvey)) => void;
  environment: TEnvironment;
  product: TProduct;
}

const SURVEY_FAILED_HEADLINE = "Survey Failed";
const SURVEY_FAILED_SUBHEADER = "Submission unsuccessful.";

export default function SurveyGeneralSettings({
  localSurvey,
  setLocalSurvey,
  product,
}: SurveyGeneralSettingsProps) {
  const [open, setOpen] = useState(true);
  const [customReward, setCustomReward] = useState(localSurvey.reward);
  const [usingCustomReward, setUsingCustomReward] = useState(
    localSurvey.reward !== product.defaultRewardInUSD
  );
  const [failureChance, setFailureChance] = useState(localSurvey.failureChance);
  const [hasFailureChance, setHasFailureChance] = useState(localSurvey.failureChance > 0);
  const [selectedLanguage, setSelectedLanguage] = useState(localSurvey.language);

  const toggleUsingDefaultReward = (isChecked: boolean) => {
    setUsingCustomReward(isChecked);
    setLocalSurvey({
      ...localSurvey,
      reward: isChecked ? customReward : product.defaultRewardInUSD,
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

  const toggleFailureChance = (isChecked: boolean) => {
    setHasFailureChance(isChecked);
    const enabledFailureCard = localSurvey.failureCard;
    enabledFailureCard.enabled = true;
    setLocalSurvey({
      ...localSurvey,
      failureChance: isChecked ? failureChance : 0,
      failureCard: isChecked ? enabledFailureCard : { enabled: false },
    });
  };

  const updateFailureRate = (e) => {
    let newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) newValue = 0;
    newValue = Math.min(Math.max(newValue, 1), 100);
    setFailureChance(newValue);
    setLocalSurvey({
      ...localSurvey,
      failureChance: newValue,
    });
  };

  const handleLanguageChange = (selectedLanguage) => {
    setSelectedLanguage(selectedLanguage);
    const isoCode = iso6391.getCode(selectedLanguage);
    setLocalSurvey({
      ...localSurvey,
      language: isoCode,
    });
  };

  const languages = iso6391.getAllNames();

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
    const languageName = iso6391.getName(localSurvey.language);
    setSelectedLanguage(languageName);
  }, [localSurvey.language]);

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

  const [failureCardMessage, setFailureCardMessage] = useState({
    headline: SURVEY_FAILED_HEADLINE,
    subheader: SURVEY_FAILED_SUBHEADER,
  });
  const [failureCardMessageToggle, setFailureCardMessageToggle] = useState(localSurvey.failureCard.enabled);

  const toggleCustomFailureScreen = () => {
    setFailureCardMessageToggle((prev) => !prev);
    const defaultHeadline = SURVEY_FAILED_HEADLINE;
    const defaultSubheader = SURVEY_FAILED_SUBHEADER;

    setLocalSurvey({
      ...localSurvey,
      failureCard: {
        enabled: !failureCardMessageToggle,
        headline: !failureCardMessageToggle
          ? defaultHeadline
          : localSurvey.failureCard.headline || defaultHeadline,
        subheader: !failureCardMessageToggle
          ? defaultSubheader
          : localSurvey.failureCard.subheader || defaultSubheader,
      },
    });
  };

  const handleCustomFailureCardMessageChange = ({
    headline,
    subheader,
  }: {
    headline?: string;
    subheader?: string;
  }) => {
    const message = {
      enabled: true,
      headline: headline ?? failureCardMessage.headline,
      subheader: subheader ?? failureCardMessage.subheader,
    };

    setFailureCardMessage(message);
    setLocalSurvey({ ...localSurvey, failureCard: message });
  };

  const [redirectToggle, setRedirectToggle] = useState(
    localSurvey.redirectOnFailUrl != null && localSurvey.redirectOnFailUrl != ""
  );
  const [urlError, setUrlError] = useState(localSurvey.redirectOnFailUrl == null);
  const [redirectOnFailUrl, setRedirectOnFailUrl] = useState<string | null>(
    localSurvey.redirectOnFailUrl ? localSurvey.redirectOnFailUrl : product.defaultRedirectOnFailUrl
  );

  const handleRedirectCheckMark = () => {
    setRedirectToggle((prev) => !prev);

    if (redirectToggle && localSurvey.redirectOnFailUrl) {
      setRedirectOnFailUrl(null);
      setLocalSurvey({ ...localSurvey, redirectOnFailUrl: null });
    }
  };

  const handleRedirectUrlChange = (link: string) => {
    setRedirectOnFailUrl(link);
    setLocalSurvey({ ...localSurvey, redirectOnFailUrl: link });
  };

  const validateUrl = (e) => {
    const url = e.target.value;
    const urlPattern = /^(http|https):\/\/[^ "]+$/;

    if (!urlPattern.test(url)) {
      setUrlError(true);
    } else {
      setUrlError(false);
    }
  };

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
              <FormbricksSelect value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue>{selectedLanguage}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </FormbricksSelect>
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
              <div className="ml-2 mt-2">
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
                <Label htmlFor="dollarSymbol" className="cursor-pointer">
                  $
                </Label>
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="ml-2 flex items-center space-x-1">
              <Switch id="failureChance" checked={hasFailureChance} onCheckedChange={toggleFailureChance} />
              <Label htmlFor="failureChance" className="cursor-pointer">
                <div className="ml-2">
                  <h3 className="text-sm font-semibold text-slate-700">Enable Survey Failure Chance</h3>
                  <p className="text-xs font-normal text-slate-500">
                    Set the chance for a completion to be treated as failed.
                  </p>
                </div>
              </Label>
            </div>

            {hasFailureChance && (
              <div className="ml-4 mt-2">
                <Label htmlFor="failureChanceInput" className="cursor-pointer">
                  Failure Chance:
                </Label>
                <Input
                  autoFocus
                  type="number"
                  id="failureChanceInput"
                  step="1"
                  onChange={updateFailureRate}
                  value={failureChance}
                  className="ml-2 mr-2 inline w-20 bg-white text-center text-sm"
                />
                <Label htmlFor="failureChanceInput" className="cursor-pointer">
                  %
                </Label>
                {failureChance === 100 && (
                  <Label className="ml-2 text-sm text-yellow-500">
                    It will not be possible for panelists to complete this survey successfully!
                  </Label>
                )}
              </div>
            )}

            {hasFailureChance && (
              <AdvancedOptionToggle
                htmlId="failureRateToggle"
                isChecked={failureCardMessageToggle}
                onToggle={toggleCustomFailureScreen}
                title="Use custom fail screen text"
                description="Customise the text on the fail screen."
                childBorder={true}>
                <div className="flex w-full items-center space-x-1 p-4 pb-4">
                  <div className="w-full cursor-pointer items-center  bg-slate-50">
                    <Label htmlFor="headline">Heading</Label>
                    <Input
                      autoFocus
                      id="heading"
                      className="mb-4 mt-2 bg-white"
                      name="heading"
                      defaultValue={localSurvey.failureCard.headline || SURVEY_FAILED_HEADLINE}
                      onChange={(e) => handleCustomFailureCardMessageChange({ headline: e.target.value })}
                    />

                    <Label htmlFor="headline">Subheading</Label>
                    <Input
                      className="mb-4 mt-2 bg-white"
                      id="subheading"
                      name="subheading"
                      defaultValue={localSurvey.failureCard.subheader || SURVEY_FAILED_SUBHEADER}
                      onChange={(e) => handleCustomFailureCardMessageChange({ subheader: e.target.value })}
                    />

                    <AdvancedOptionToggle
                      htmlId="redirectOnFailUrl"
                      isChecked={redirectToggle}
                      onToggle={handleRedirectCheckMark}
                      title="Redirect on failure"
                      description="Redirect user to specified link on survey failure"
                      childBorder={true}>
                      <div className="w-full p-4">
                        <div className="flex w-full cursor-pointer items-center">
                          <p className="mr-2 w-[400px] text-sm font-semibold text-slate-700">
                            Redirect here:
                          </p>
                          <Input
                            autoFocus
                            className="w-full bg-white"
                            type="url"
                            placeholder="https://www.example.com"
                            value={redirectOnFailUrl ? redirectOnFailUrl : ""}
                            onChange={(e) => handleRedirectUrlChange(e.target.value)}
                            onBlur={validateUrl}
                          />
                        </div>
                        {urlError && <p className="mt-2 text-sm text-red-500">Please enter a valid URL.</p>}
                      </div>
                    </AdvancedOptionToggle>
                  </div>
                </div>
              </AdvancedOptionToggle>
            )}
          </div>
          <div className="p-3">
            <div className="ml-2 flex items-center space-x-1">
              <Switch
                id="limitedToCountries"
                checked={limitedToCountries}
                onCheckedChange={toggleLimitedToCountries}
                className={"mr-2"}
              />
              <Label htmlFor="countries" className="cursor-pointer">
                Limit to Countries
              </Label>

              {limitedToCountries && (
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
              )}
            </div>
          </div>
        </div>
      </Collapsible.CollapsibleContent>
    </Collapsible.Root>
  );
}
