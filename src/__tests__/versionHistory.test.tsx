import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { Toaster } from "react-hot-toast";
import axiosInstance from "../services/axios";
import { resumeService } from "../services/resume.service";
import ResumeEditor from "../components/ResumeEditor";
import { IResume, SectionType } from "../types/resume";
import { formatRelativeTime } from "../utils/date";

jest.mock("../services/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  AUTH_LOGOUT_EVENT: "auth:logout",
}));

jest.mock("react-resizable-panels", () => ({
  PanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div role="separator" {...props}>
      {children}
    </div>
  ),
}));

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

const buildCurrentResume = (overrides?: Partial<IResume>): IResume => ({
  _id: "res-vh-1",
  title: "Principal Frontend Resume",
  summary: "Current live summary in editor.",
  templateId: "executive",
  themeConfig: { primaryColor: "#2563eb", sectionSpacing: "normal" },
  content: {
    basics: {
      name: "Jordan Current",
      label: "Principal Engineer",
      email: "jordan@example.com",
      phone: "555-0199",
      summary: "Current live summary in editor.",
      location: { city: "San Francisco", countryCode: "US" },
    },
    sections: [
      {
        id: "sec-work",
        type: SectionType.WORK,
        title: "Professional Experience",
        content: [
          {
            id: "work-1",
            name: "CurrentCorp",
            position: "Principal Engineer",
            startDate: "2023",
            current: true,
            description: "Leading core frontend architecture.",
          },
        ],
      },
    ],
    sectionOrder: ["sec-work"],
  },
  ...overrides,
});

describe("Version History service, drawer, preview, restore & Undo toast", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  describe("formatRelativeTime", () => {
    it("formats relative durations accurately", () => {
      const now = new Date("2026-11-19T12:00:00.000Z").getTime();
      expect(formatRelativeTime("2026-11-19T11:59:40.000Z", now)).toBe(
        "Just now"
      );
      expect(formatRelativeTime("2026-11-19T11:45:00.000Z", now)).toBe(
        "15 minutes ago"
      );
      expect(formatRelativeTime("2026-11-19T09:00:00.000Z", now)).toBe(
        "3 hours ago"
      );
      expect(formatRelativeTime("2026-11-18T11:00:00.000Z", now)).toBe(
        "Yesterday"
      );
      expect(formatRelativeTime("2026-11-15T12:00:00.000Z", now)).toBe(
        "4 days ago"
      );
    });
  });

  describe("resumeService history API methods", () => {
    it("fetches history summaries, full snapshots, and restores with previousSnapshotIndex", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              index: 1,
              updatedAt: "2026-11-19T11:50:00.000Z",
              title: "Draft v2",
              summary: "2 sections · 85 words (+1 section, +40 words)",
              sectionCount: 2,
              wordCount: 85,
            },
          ],
        },
      } as any);

      const history = await resumeService.getResumeHistory("res-1");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/resumes/res-1/history"
      );
      expect(history).toHaveLength(1);
      expect(history[0].index).toBe(1);

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            index: 1,
            title: "Draft v2",
            content: { basics: { name: "Jordan" }, sections: [], sectionOrder: [] },
            updatedAt: "2026-11-19T11:50:00.000Z",
          },
        },
      } as any);

      const snap = await resumeService.getResumeHistorySnapshot("res-1", 1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/resumes/res-1/history/1"
      );
      expect(snap.title).toBe("Draft v2");

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          previousSnapshotIndex: 2,
          data: {
            _id: "res-1",
            userId: "u-1",
            title: "Draft v2",
            createdAt: "2026-11-19T10:00:00.000Z",
            updatedAt: "2026-11-19T12:00:00.000Z",
            content: { basics: { name: "Jordan" }, sections: [], sectionOrder: [] },
          },
        },
      } as any);

      const restored = await resumeService.restoreResumeVersion("res-1", 1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/resumes/res-1/history/1/restore"
      );
      expect(restored.previousSnapshotIndex).toBe(2);
      expect(restored.resume.id).toBe("res-1");
      expect(restored.resume.title).toBe("Draft v2");
    });
  });

  describe("ResumeEditor Version History UI flow", () => {
    it("shows empty state for unsaved new resume and empty history state for saved resume without snapshots", async () => {
      const { unmount } = render(<ResumeEditor onBack={jest.fn()} />);

      fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
      fireEvent.click(
        screen.getByRole("menuitem", { name: /version history/i })
      );

      expect(
        screen.getByTestId("version-history-unsaved-empty")
      ).toBeInTheDocument();
      expect(mockedAxios.get).not.toHaveBeenCalled();

      // Escape closes the drawer
      fireEvent.keyDown(document, { key: "Escape" });
      expect(
        screen.queryByTestId("version-history-drawer")
      ).not.toBeInTheDocument();
      unmount();

      // Saved resume with 0 snapshots
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      } as any);

      render(
        <ResumeEditor initialResume={buildCurrentResume()} onBack={jest.fn()} />
      );
      fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
      fireEvent.click(
        screen.getByRole("menuitem", { name: /version history/i })
      );

      expect(
        await screen.findByTestId("version-history-empty")
      ).toBeInTheDocument();
      expect(screen.getByText(/no saved versions yet/i)).toBeInTheDocument();
    });

    it("handles error state and retries loading history cleanly", async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error("Server unavailable"))
        .mockResolvedValueOnce({
          data: { success: true, data: [] },
        } as any);

      render(
        <ResumeEditor initialResume={buildCurrentResume()} onBack={jest.fn()} />
      );
      fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
      fireEvent.click(
        screen.getByRole("menuitem", { name: /version history/i })
      );

      const errorAlert = await screen.findByTestId("version-history-error");
      expect(errorAlert).toHaveTextContent("Server unavailable");

      fireEvent.click(
        within(errorAlert).getByRole("button", { name: /try again/i })
      );

      expect(
        await screen.findByTestId("version-history-empty")
      ).toBeInTheDocument();
    });

    it("lists versions with relative times, renders read-only preview with resume's current template, confirms restore, reloads editor, and supports Undo toast", async () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // 1. GET /api/resumes/res-vh-1/history
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              index: 1,
              updatedAt: fiveMinsAgo,
              title: "Midday Revision",
              summary: "1 section · 42 words (+14 words)",
              sectionCount: 1,
              wordCount: 42,
            },
            {
              index: 0,
              updatedAt: twoHoursAgo,
              title: "Morning Baseline",
              summary: "1 section · 28 words",
              sectionCount: 1,
              wordCount: 28,
            },
          ],
        },
      } as any);

      // 2. GET /api/resumes/res-vh-1/history/1 (auto-selected newest snapshot)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            index: 1,
            title: "Midday Revision",
            summary: "Midday summary snapshot.",
            templateId: "classic",
            content: {
              basics: {
                name: "Jordan Midday",
                label: "Staff Engineer",
                email: "jordan@example.com",
                summary: "Midday summary snapshot.",
              },
              sections: [],
              sectionOrder: [],
            },
            updatedAt: fiveMinsAgo,
          },
        },
      } as any);

      // 3. GET /api/resumes/res-vh-1/history/0 (when user clicks older version)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            index: 0,
            title: "Morning Baseline",
            summary: "Morning baseline summary.",
            templateId: "classic",
            content: {
              basics: {
                name: "Jordan Morning",
                label: "Senior Frontend Engineer",
                email: "jordan@example.com",
                summary: "Morning baseline summary.",
              },
              sections: [],
              sectionOrder: [],
            },
            updatedAt: twoHoursAgo,
          },
        },
      } as any);

      // 4. POST /api/resumes/res-vh-1/history/0/restore
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          previousSnapshotIndex: 2,
          data: {
            _id: "res-vh-1",
            userId: "u-1",
            title: "Morning Baseline",
            summary: "Morning baseline summary.",
            templateId: "executive",
            createdAt: twoHoursAgo,
            updatedAt: new Date().toISOString(),
            content: {
              basics: {
                name: "Jordan Morning",
                label: "Senior Frontend Engineer",
                email: "jordan@example.com",
                summary: "Morning baseline summary.",
              },
              sections: [],
              sectionOrder: [],
            },
          },
        },
      } as any);

      // 5. POST /api/resumes/res-vh-1/history/2/restore (Undo button on toast)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          previousSnapshotIndex: 3,
          data: {
            _id: "res-vh-1",
            userId: "u-1",
            title: "Principal Frontend Resume",
            summary: "Current live summary in editor.",
            templateId: "executive",
            createdAt: twoHoursAgo,
            updatedAt: new Date().toISOString(),
            content: {
              basics: {
                name: "Jordan Current",
                label: "Principal Engineer",
                email: "jordan@example.com",
                summary: "Current live summary in editor.",
              },
              sections: [],
              sectionOrder: [],
            },
          },
        },
      } as any);

      render(
        <>
          <ResumeEditor
            initialResume={buildCurrentResume()}
            onBack={jest.fn()}
          />
          <Toaster />
        </>
      );

      // Open Version history from toolbar overflow menu
      fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
      fireEvent.click(
        screen.getByRole("menuitem", { name: /version history/i })
      );

      const drawer = await screen.findByTestId("version-history-drawer");
      expect(await within(drawer).findByText("5 minutes ago")).toBeInTheDocument();
      expect(within(drawer).getByText("2 hours ago")).toBeInTheDocument();
      expect(
        within(drawer).getByText("1 section · 42 words (+14 words)")
      ).toBeInTheDocument();

      // Wait for auto-selected newest snapshot preview to render with current template ("executive")
      const previewPage = await within(drawer).findByTestId(
        "version-history-preview-page"
      );
      expect(previewPage).toHaveAttribute("data-template-id", "executive");
      expect(
        within(drawer).getByTestId("version-preview-template-badge")
      ).toHaveTextContent(/Executive/i);
      expect(within(previewPage).getByText("Jordan Midday")).toBeInTheDocument();

      // Keyboard navigation (ArrowDown moves selection to older version index 0)
      fireEvent.keyDown(within(drawer).getByTestId("version-history-item-1"), {
        key: "ArrowDown",
      });
      await waitFor(() => {
        expect(
          within(
            within(drawer).getByTestId("version-history-preview-page")
          ).getByText("Jordan Morning")
        ).toBeInTheDocument();
      });

      // Click 'Restore this version' -> opens confirm dialog
      fireEvent.click(within(drawer).getByTestId("restore-version-btn"));
      const confirmDialog = screen.getByTestId(
        "restore-version-confirm-dialog"
      );
      expect(confirmDialog).toHaveTextContent("Restore this version?");
      expect(confirmDialog).toHaveTextContent("Morning Baseline");

      // Confirm restore
      await act(async () => {
        fireEvent.click(
          within(confirmDialog).getByTestId("confirm-restore-version-btn")
        );
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/resumes/res-vh-1/history/0/restore"
      );

      // Drawer closes and editor inputs reload to restored version without triggering dirty PUT
      await waitFor(() => {
        expect(
          screen.queryByTestId("version-history-drawer")
        ).not.toBeInTheDocument();
      });
      expect((screen.getByLabelText("Full Name") as HTMLInputElement).value).toBe(
        "Jordan Morning"
      );
      expect(
        (screen.getByLabelText("Professional Summary") as HTMLTextAreaElement)
          .value
      ).toBe("Morning baseline summary.");
      expect(
        within(screen.getByTestId("resume-title-heading")).getByRole("heading", {
          level: 1,
        })
      ).toHaveTextContent("Morning Baseline");
      expect(mockedAxios.put).not.toHaveBeenCalled();

      // Toast with Undo button appears; clicking Undo restores previousSnapshotIndex (2)
      const undoToastBtn = await screen.findByTestId("undo-restore-toast-btn");
      await act(async () => {
        fireEvent.click(undoToastBtn);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/resumes/res-vh-1/history/2/restore"
      );

      await waitFor(() => {
        expect(
          (screen.getByLabelText("Full Name") as HTMLInputElement).value
        ).toBe("Jordan Current");
      });
      expect(
        (screen.getByLabelText("Professional Summary") as HTMLTextAreaElement)
          .value
      ).toBe("Current live summary in editor.");
      expect(mockedAxios.put).not.toHaveBeenCalled();
    });
  });
});
