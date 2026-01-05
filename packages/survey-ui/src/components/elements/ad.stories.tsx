import type { Meta, StoryObj } from "@storybook/react";
import {
  type BaseStylingOptions,
  type LabelStylingOptions,
  commonArgTypes,
  createCSSVariablesDecorator,
  elementStylingArgTypes,
  labelStylingArgTypes,
  surveyStylingArgTypes,
} from "../../lib/story-helpers";
import { Ad, type AdProps } from "./ad";

type StoryProps = AdProps & Partial<BaseStylingOptions & LabelStylingOptions> & Record<string, unknown>;

const meta: Meta<StoryProps> = {
  title: "UI-package/Elements/Ad",
  component: Ad,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An advertisement element that displays Google Ad Manager (GPT) ads. Can include headline, description, and media content.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    ...commonArgTypes,
    adUnitPath: {
      control: "text",
      description: "Google Ad Manager ad unit path",
      table: { category: "Ad Configuration" },
    },
    adSizes: {
      control: "object",
      description: "Ad sizes configuration",
      table: { category: "Ad Configuration" },
    },
    adDivId: {
      control: "text",
      description: "ID for the ad container div",
      table: { category: "Ad Configuration" },
    },
    minWidth: {
      control: "text",
      description: "Minimum width for the ad container",
      table: { category: "Layout" },
    },
    minHeight: {
      control: "text",
      description: "Minimum height for the ad container",
      table: { category: "Layout" },
    },
  },
};

export default meta;
type Story = StoryObj<StoryProps>;

export const StylingPlayground: Story = {
  args: {
    elementId: "ad-1",
    headline: "Sponsored links",
    description: "This content is sponsored by our partners",
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
    elementId: "ad-1",
    headline: "Sponsored links",
  },
};

export const WithDescription: Story = {
  args: {
    elementId: "ad-2",
    headline: "Sponsored links",
    description: "Please view the advertisement below to help support us",
  },
};

export const Required: Story = {
  args: {
    elementId: "ad-3",
    headline: "Sponsored links",
    description: "This content is sponsored by our partners",
    required: true,
  },
};

export const WithImage: Story = {
  args: {
    elementId: "ad-4",
    headline: "Sponsored links",
    description: "Check out these sponsored offers",
    imageUrl: "https://picsum.photos/seed/ad-image/800/400",
  },
};

export const WithVideo: Story = {
  args: {
    elementId: "ad-5",
    headline: "Sponsored links",
    description: "Watch and learn about our partners",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
};

export const CustomAdConfiguration: Story = {
  args: {
    elementId: "ad-6",
    headline: "Custom Ad Unit",
    description: "This ad uses custom configuration",
    adUnitPath: "/9505169/CUSTOM_AD_UNIT",
    adSizes: [
      [300, 250],
      [336, 280],
    ],
    adDivId: "div-gpt-custom-ad",
    minWidth: "336px",
    minHeight: "280px",
  },
};

export const RTL: Story = {
  args: {
    elementId: "ad-rtl",
    dir: "rtl",
    headline: "روابط دعائية",
    description: "يرجى مشاهدة الإعلان أدناه لدعمنا",
  },
};

export const MultipleAds: Story = {
  render: () => (
    <div className="w-[600px] space-y-8">
      <Ad
        elementId="ad-1"
        headline="Sponsored links"
        description="First advertisement section"
        adDivId="div-gpt-ad-1"
      />
      <Ad
        elementId="ad-2"
        headline="Additional sponsor"
        description="Second advertisement section"
        adDivId="div-gpt-ad-2"
      />
    </div>
  ),
};
