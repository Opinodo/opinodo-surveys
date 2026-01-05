import type { Meta, StoryObj } from "@storybook/react";
import {
  type BaseStylingOptions,
  type LabelStylingOptions,
  createCSSVariablesDecorator,
  elementStylingArgTypes,
  labelStylingArgTypes,
  surveyStylingArgTypes,
} from "../../lib/story-helpers";
import { AdExplanation, type AdExplanationProps } from "./ad-explanation";

type StoryProps = AdExplanationProps &
  Partial<BaseStylingOptions & LabelStylingOptions> &
  Record<string, unknown>;

const meta: Meta<StoryProps> = {
  title: "UI-package/Elements/AdExplanation",
  component: AdExplanation,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A collapsible explanation component that tells users why they are seeing an advertisement. Provides transparency about ad placement in surveys.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    whyAmISeeingThisAd: {
      control: "text",
      description: "Button text to expand the explanation",
      table: { category: "Content" },
    },
    adExplanation: {
      control: "text",
      description: "Title shown when explanation is expanded",
      table: { category: "Content" },
    },
    adDescription: {
      control: "text",
      description: "Description text shown when explanation is expanded",
      table: { category: "Content" },
    },
    showLess: {
      control: "text",
      description: "Button text to collapse the explanation",
      table: { category: "Content" },
    },
    dir: {
      control: "select",
      options: ["ltr", "rtl", "auto"],
      description: "Text direction",
      table: { category: "Layout" },
    },
  },
};

export default meta;
type Story = StoryObj<StoryProps>;

export const StylingPlayground: Story = {
  args: {
    whyAmISeeingThisAd: "Why am I seeing this ad?",
    adExplanation: "About This Ad",
    adDescription:
      "Ads help support the surveys you take. We show relevant ads based on your interests and survey responses.",
    showLess: "Show less",
  },
  argTypes: {
    ...elementStylingArgTypes,
    ...labelStylingArgTypes,
    ...surveyStylingArgTypes,
  },
  decorators: [createCSSVariablesDecorator<StoryProps>()],
};

export const Default: Story = {
  args: {
    whyAmISeeingThisAd: "Why am I seeing this ad?",
    adExplanation: "About This Ad",
    adDescription:
      "Ads help support the surveys you take. We show relevant ads based on your interests and survey responses.",
    showLess: "Show less",
  },
};

export const Expanded: Story = {
  args: {
    whyAmISeeingThisAd: "Why am I seeing this ad?",
    adExplanation: "About This Ad",
    adDescription:
      "Ads help support the surveys you take. We show relevant ads based on your interests and survey responses.",
    showLess: "Show less",
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    if (button) {
      button.click();
    }
  },
};

export const CustomText: Story = {
  args: {
    whyAmISeeingThisAd: "Learn about this advertisement",
    adExplanation: "Advertisement Information",
    adDescription:
      "This survey is sponsored by our partners. Your responses help us provide better content and services.",
    showLess: "Hide details",
  },
};

export const RTL: Story = {
  args: {
    dir: "rtl",
    whyAmISeeingThisAd: "لماذا أرى هذا الإعلان؟",
    adExplanation: "حول هذا الإعلان",
    adDescription:
      "تساعد الإعلانات في دعم الاستطلاعات التي تجريها. نعرض إعلانات ذات صلة بناءً على اهتماماتك.",
    showLess: "إظهار أقل",
  },
};

export const ShortDescription: Story = {
  args: {
    whyAmISeeingThisAd: "Why am I seeing this ad?",
    adExplanation: "Ad Info",
    adDescription: "Ads support free surveys.",
    showLess: "Close",
  },
};

export const LongDescription: Story = {
  args: {
    whyAmISeeingThisAd: "Why am I seeing this ad?",
    adExplanation: "Detailed Ad Explanation",
    adDescription:
      "We understand that advertisements can sometimes be disruptive to your survey experience. However, these ads are essential in helping us maintain free access to our survey platform. The advertisements you see are carefully selected based on various factors including your demographic information, survey responses, and browsing patterns. We work with trusted advertising partners who adhere to strict privacy guidelines and do not share your personal information without consent. Your participation helps us continue providing valuable survey opportunities.",
    showLess: "Show less",
  },
};

export const InContext: Story = {
  render: (args) => (
    <div className="w-[600px] space-y-4 rounded-lg bg-gray-50 p-6">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-bold">Survey Question</h2>
        <p className="mb-4 text-gray-600">How satisfied are you with our service?</p>
      </div>
      <AdExplanation {...args} />
      <div className="h-64 rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center">
        <span className="text-gray-400">Ad Placeholder</span>
      </div>
    </div>
  ),
  args: {
    whyAmISeeingThisAd: "Why am I seeing this ad?",
    adExplanation: "About This Ad",
    adDescription:
      "Ads help support the surveys you take. We show relevant ads based on your interests and survey responses.",
    showLess: "Show less",
  },
};
