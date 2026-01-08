import { beforeEach, describe, expect, test, vi } from "vitest";
import { TResponse, TResponseInput } from "@formbricks/types/responses";
import { updateResponse } from "@/lib/response/service";
import { updateResponseWithQuotaEvaluation } from "./response";

vi.mock("@/lib/response/service");

const mockUpdateResponse = vi.mocked(updateResponse);

describe("updateResponseWithQuotaEvaluation", () => {
  const mockResponseId = "response123";
  const mockResponseInput: Partial<TResponseInput> = {
    data: { question1: "answer1" },
    finished: true,
    language: "en",
  };

  const mockResponse: TResponse = {
    id: "response123",
    surveyId: "survey123",
    finished: true,
    data: { question1: "answer1" },
    meta: {},
    ttc: {},
    variables: { var1: "value1" },
    contactAttributes: {},
    singleUseId: null,
    language: "en",
    displayId: null,
    endingId: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    panelistId: null,
    contact: {
      id: "contact123",
      userId: "user123",
    },
    tags: [
      {
        id: "tag123",
        name: "important",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        environmentId: "env123",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return response directly without quota evaluation", async () => {
    mockUpdateResponse.mockResolvedValue(mockResponse);

    const result = await updateResponseWithQuotaEvaluation(mockResponseId, mockResponseInput);

    expect(mockUpdateResponse).toHaveBeenCalledWith(mockResponseId, mockResponseInput);
    expect(result).toEqual(mockResponse);
  });

  test("should pass through the response from updateResponse", async () => {
    const responseWithNullLanguage = { ...mockResponse, language: null };
    mockUpdateResponse.mockResolvedValue(responseWithNullLanguage);

    const result = await updateResponseWithQuotaEvaluation(mockResponseId, mockResponseInput);

    expect(mockUpdateResponse).toHaveBeenCalledWith(mockResponseId, mockResponseInput);
    expect(result).toEqual(responseWithNullLanguage);
  });
});
