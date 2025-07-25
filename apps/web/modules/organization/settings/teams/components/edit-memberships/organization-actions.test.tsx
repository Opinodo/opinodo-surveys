import { FORMBRICKS_ENVIRONMENT_ID_LS } from "@/lib/localStorage";
import { inviteUserAction, leaveOrganizationAction } from "@/modules/organization/settings/teams/actions";
import { InviteMemberModal } from "@/modules/organization/settings/teams/components/invite-member/invite-member-modal";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TOrganization } from "@formbricks/types/organizations";
import { OrganizationActions } from "./organization-actions";

// Mock the next/navigation module
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock the actions
vi.mock("@/modules/organization/settings/teams/actions", () => ({
  inviteUserAction: vi.fn(),
  leaveOrganizationAction: vi.fn(),
}));

// Mock the InviteMemberModal
vi.mock("@/modules/organization/settings/teams/components/invite-member/invite-member-modal", () => ({
  InviteMemberModal: vi.fn(({ open, setOpen, onSubmit }) => {
    if (!open) return null;
    return (
      <div data-testid="invite-member-modal">
        <button
          data-testid="invite-submit-btn"
          onClick={() =>
            onSubmit([{ email: "test@example.com", name: "Test User", role: "admin", teamIds: [] }])
          }>
          Submit
        </button>
        <button data-testid="invite-close-btn" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    );
  }),
}));

// Mock the Dialog components
vi.mock("@/modules/ui/components/dialog", () => ({
  Dialog: vi.fn(({ children, open, onOpenChange }) => {
    if (!open) return null;
    return (
      <div data-testid="leave-org-modal" onClick={() => onOpenChange && onOpenChange(false)}>
        {children}
      </div>
    );
  }),
  DialogContent: vi.fn(({ children }) => <div data-testid="dialog-content">{children}</div>),
  DialogHeader: vi.fn(({ children }) => <div data-testid="dialog-header">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <div data-testid="dialog-title">{children}</div>),
  DialogDescription: vi.fn(({ children }) => <div data-testid="dialog-description">{children}</div>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock tolgee
vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key) => key,
  }),
}));

// Mock Button component
vi.mock("@/modules/ui/components/button", () => ({
  Button: vi.fn(({ children, onClick, loading, disabled, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={
        props.variant === "destructive"
          ? "leave-org-confirm-btn"
          : props.variant === "secondary" && children === "common.cancel"
            ? "leave-org-cancel-btn"
            : undefined
      }
      {...props}>
      {children}
    </button>
  )),
}));

describe("OrganizationActions Component", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };

  const defaultProps = {
    role: "member" as const,
    membershipRole: "member" as const,
    isLeaveOrganizationDisabled: false,
    organization: { id: "org-123", name: "Test Org" } as TOrganization,
    teams: [{ id: "team-1", name: "Team 1" }],
    isInviteDisabled: false,
    canDoRoleManagement: true,
    isFormbricksCloud: false,
    environmentId: "env-123",
    isMultiOrgEnabled: true,
    isUserManagementDisabledFromUi: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as AppRouterInstance);
  });

  afterEach(() => {
    cleanup();
  });

  test("renders without crashing", () => {
    render(<OrganizationActions {...defaultProps} />);
    expect(screen.getByText("environments.settings.general.leave_organization")).toBeInTheDocument();
  });

  test("does not show leave organization button when role is owner", () => {
    render(<OrganizationActions {...defaultProps} role="owner" />);
    expect(screen.queryByText("environments.settings.general.leave_organization")).not.toBeInTheDocument();
  });

  test("does not show leave organization button when multi-org is disabled", () => {
    render(<OrganizationActions {...defaultProps} isMultiOrgEnabled={false} />);
    expect(screen.queryByText("environments.settings.general.leave_organization")).not.toBeInTheDocument();
  });

  test("does not show invite button when isInviteDisabled is true", () => {
    render(<OrganizationActions {...defaultProps} isInviteDisabled={true} />);
    expect(screen.queryByText("environments.settings.teams.invite_member")).not.toBeInTheDocument();
  });

  test("does not show invite button when user is not owner or manager", () => {
    render(<OrganizationActions {...defaultProps} membershipRole="member" />);
    expect(screen.queryByText("environments.settings.teams.invite_member")).not.toBeInTheDocument();
  });

  test("shows invite button when user is owner", () => {
    render(<OrganizationActions {...defaultProps} membershipRole="owner" />);
    expect(screen.getByText("environments.settings.teams.invite_member")).toBeInTheDocument();
  });

  test("shows invite button when user is manager", () => {
    render(<OrganizationActions {...defaultProps} membershipRole="manager" />);
    expect(screen.getByText("environments.settings.teams.invite_member")).toBeInTheDocument();
  });

  test("opens invite member modal when clicking the invite button", () => {
    render(<OrganizationActions {...defaultProps} membershipRole="owner" />);
    fireEvent.click(screen.getByText("environments.settings.teams.invite_member"));
    expect(screen.getByTestId("invite-member-modal")).toBeInTheDocument();
  });

  test("opens leave organization modal when clicking the leave button", () => {
    render(<OrganizationActions {...defaultProps} />);
    fireEvent.click(screen.getByText("environments.settings.general.leave_organization"));
    expect(screen.getByTestId("leave-org-modal")).toBeInTheDocument();
  });

  test("handles successful member invite", async () => {
    vi.mocked(inviteUserAction).mockResolvedValue({ data: "invite-123" });

    render(<OrganizationActions {...defaultProps} membershipRole="owner" />);
    fireEvent.click(screen.getByText("environments.settings.teams.invite_member"));
    fireEvent.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(inviteUserAction).toHaveBeenCalledWith({
        organizationId: "org-123",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
        teamIds: [],
      });
      expect(toast.success).toHaveBeenCalledWith("environments.settings.general.member_invited_successfully");
    });
  });

  test("handles failed member invite", async () => {
    vi.mocked(inviteUserAction).mockResolvedValue({ serverError: "Failed to invite user" });

    render(<OrganizationActions {...defaultProps} membershipRole="owner" />);
    fireEvent.click(screen.getByText("environments.settings.teams.invite_member"));
    fireEvent.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(inviteUserAction).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  test("handles leave organization successfully", async () => {
    vi.mocked(leaveOrganizationAction).mockResolvedValue({
      data: [
        {
          userId: "123",
          role: "admin",
          teamId: "team-1",
        },
      ],
    });

    render(<OrganizationActions {...defaultProps} />);
    fireEvent.click(screen.getByText("environments.settings.general.leave_organization"));
    fireEvent.click(screen.getByTestId("leave-org-confirm-btn"));

    await waitFor(() => {
      expect(leaveOrganizationAction).toHaveBeenCalledWith({ organizationId: "org-123" });
      expect(toast.success).toHaveBeenCalledWith("environments.settings.general.member_deleted_successfully");
      expect(localStorage.removeItem).toHaveBeenCalledWith(FORMBRICKS_ENVIRONMENT_ID_LS);
      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  test("handles leave organization error", async () => {
    const mockError = new Error("Failed to leave organization");
    vi.mocked(leaveOrganizationAction).mockRejectedValue(mockError);

    render(<OrganizationActions {...defaultProps} />);
    fireEvent.click(screen.getByText("environments.settings.general.leave_organization"));
    fireEvent.click(screen.getByTestId("leave-org-confirm-btn"));

    await waitFor(() => {
      expect(leaveOrganizationAction).toHaveBeenCalledWith({ organizationId: "org-123" });
      expect(toast.error).toHaveBeenCalledWith("Error: Failed to leave organization");
    });
  });

  test("cannot leave organization when only one organization is present", () => {
    render(<OrganizationActions {...defaultProps} isMultiOrgEnabled={false} />);
    expect(screen.queryByText("environments.settings.general.leave_organization")).not.toBeInTheDocument();
  });

  test("invite member modal closes on close button click", () => {
    render(<OrganizationActions {...defaultProps} membershipRole="owner" />);
    fireEvent.click(screen.getByText("environments.settings.teams.invite_member"));
    expect(screen.getByTestId("invite-member-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("invite-close-btn"));
    expect(screen.queryByTestId("invite-member-modal")).not.toBeInTheDocument();
  });

  test("leave organization modal closes on cancel", () => {
    render(<OrganizationActions {...defaultProps} />);
    fireEvent.click(screen.getByText("environments.settings.general.leave_organization"));
    expect(screen.getByTestId("leave-org-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("leave-org-cancel-btn"));
    expect(screen.queryByTestId("leave-org-modal")).not.toBeInTheDocument();
  });

  test("leave organization button is disabled and warning shown when isLeaveOrganizationDisabled is true", () => {
    render(<OrganizationActions {...defaultProps} isLeaveOrganizationDisabled={true} />);
    fireEvent.click(screen.getByText("environments.settings.general.leave_organization"));
    expect(screen.getByTestId("leave-org-modal")).toBeInTheDocument();
    expect(
      screen.getByText("environments.settings.general.cannot_leave_only_organization")
    ).toBeInTheDocument();
  });

  test("invite button is hidden when isUserManagementDisabledFromUi is true", () => {
    render(
      <OrganizationActions {...defaultProps} membershipRole="owner" isUserManagementDisabledFromUi={true} />
    );
    expect(screen.queryByText("environments.settings.teams.invite_member")).not.toBeInTheDocument();
  });

  test("invite button is hidden when membershipRole is undefined", () => {
    render(<OrganizationActions {...defaultProps} membershipRole={undefined} />);
    expect(screen.queryByText("environments.settings.teams.invite_member")).not.toBeInTheDocument();
  });

  test("invite member modal receives correct props", () => {
    render(<OrganizationActions {...defaultProps} membershipRole="owner" />);
    fireEvent.click(screen.getByText("environments.settings.teams.invite_member"));
    const modal = screen.getByTestId("invite-member-modal");
    expect(modal).toBeInTheDocument();

    const calls = vi.mocked(InviteMemberModal).mock.calls;
    expect(
      calls.some((call) =>
        expect
          .objectContaining({
            environmentId: "env-123",
            canDoRoleManagement: true,
            isFormbricksCloud: false,
            teams: expect.arrayContaining(defaultProps.teams),
            membershipRole: "owner",
            open: true,
            setOpen: expect.any(Function),
            onSubmit: expect.any(Function),
          })
          .asymmetricMatch(call[0])
      )
    ).toBe(true);
  });
});
