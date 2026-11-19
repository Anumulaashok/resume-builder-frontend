import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import ResumeEditor, { getItemDisplayLines, normalizeResume } from "../ResumeEditor";
import EducationForm from "../Education-form";
import { IResume, SectionType } from "../../types/resume";
import { resumeService } from "../../services/resume.service";

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

jest.mock("../../services/resume.service", () => ({
  resumeService: {
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    exportResumePdf: jest.fn(),
    exportResumeTxt: jest.fn(),
  },
}));

const buildSampleResume = (overrides?: Partial<IResume>): IResume => ({
  _id: "res-101",
  title: "Staff Frontend Resume",
  content: {
    basics: {
      name: "Jordan Lee",
      label: "Staff Frontend Engineer",
      email: "jordan@example.com",
      phone: "555-0199",
      summary: "10+ years building accessible, high-performance web applications.",
      location: {
        city: "San Francisco",
        countryCode: "US",
      },
    },
    sections: [
      {
        id: "sec-work-1",
        type: SectionType.WORK,
        title: "Professional Experience",
        content: [
          {
            id: "work-1",
            name: "Acme Corp",
            position: "Principal Engineer",
            startDate: "Jan 2021",
            current: true,
            location: "San Francisco, CA",
            description: "Led design system migration.",
          },
        ],
      },
      {
        id: "sec-skills-1",
        type: SectionType.SKILLS,
        title: "Skills",
        content: [
          {
            id: "skill-1",
            name: "TypeScript",
            level: 5,
            subSkills: ["React", "Accessibility"],
          },
        ],
      },
    ],
    sectionOrder: ["sec-work-1", "sec-skills-1"],
  },
  ...overrides,
});

describe("ResumeEditor light theme, layout, and bindings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("populates Professional Summary from content.basics.summary and falls back to top-level API summary", () => {
    const resumeWithBasicsSummary = buildSampleResume();
    const { unmount } = render(
      <ResumeEditor initialResume={resumeWithBasicsSummary} onBack={jest.fn()} />
    );

    const summaryTextarea = screen.getByLabelText("Professional Summary") as HTMLTextAreaElement;
    expect(summaryTextarea.value).toBe(
      "10+ years building accessible, high-performance web applications."
    );
    unmount();

    // Simulate API payload where top-level summary is returned and content.basics.summary was stripped
    const apiResumeWithTopSummary: IResume = {
      _id: "res-102",
      title: "Backend API Resume",
      summary: "Summary stored at top-level via API.",
      content: {
        basics: {
          name: "Taylor Kim",
          email: "taylor@example.com",
        },
        sections: [],
        sectionOrder: [],
      },
    };

    render(<ResumeEditor initialResume={apiResumeWithTopSummary} onBack={jest.fn()} />);

    const hydratedTextarea = screen.getByLabelText("Professional Summary") as HTMLTextAreaElement;
    expect(hydratedTextarea.value).toBe("Summary stored at top-level via API.");
  });

  it("syncs edits in Professional Summary to both content.basics.summary and top-level summary on save", async () => {
    (resumeService.updateResume as jest.Mock).mockResolvedValueOnce({
      _id: "res-101",
    });

    const onSave = jest.fn();
    render(
      <ResumeEditor
        initialResume={buildSampleResume()}
        onBack={jest.fn()}
        onSave={onSave}
      />
    );

    const summaryTextarea = screen.getByLabelText("Professional Summary");
    fireEvent.change(summaryTextarea, {
      target: { value: "Updated executive summary for staff role." },
    });

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(resumeService.updateResume).toHaveBeenCalledWith(
        "res-101",
        expect.objectContaining({
          summary: "Updated executive summary for staff role.",
          content: expect.objectContaining({
            basics: expect.objectContaining({
              summary: "Updated executive summary for staff role.",
            }),
          }),
        })
      );
    });
  });

  it("renders resume title as an inline-editable heading and collapses secondary actions into an overflow menu", () => {
    render(<ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />);

    // Heading rendered instead of boxed input initially
    const headingTrigger = screen.getByTestId("resume-title-heading");
    expect(within(headingTrigger).getByRole("heading", { level: 1 })).toHaveTextContent(
      "Staff Frontend Resume"
    );
    expect(screen.queryByLabelText("Resume Title")).not.toBeInTheDocument();

    // Click heading to edit inline
    fireEvent.click(headingTrigger);
    const titleInput = screen.getByLabelText("Resume Title") as HTMLInputElement;
    expect(titleInput.value).toBe("Staff Frontend Resume");

    fireEvent.change(titleInput, { target: { value: "Principal UI Resume" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(
      within(screen.getByTestId("resume-title-heading")).getByRole("heading", { level: 1 })
    ).toHaveTextContent("Principal UI Resume");

    // Share button preserves test id
    expect(screen.getByTestId("share-resume-btn-1")).toBeInTheDocument();

    // Secondary actions collapsed until More actions is clicked
    expect(screen.queryByRole("menuitem", { name: /clone/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    expect(screen.getByRole("menuitem", { name: /clone/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /export/i })).toBeInTheDocument();
  });

  it("renders section cards with drag handles, accessible action labels, primary + secondary item lines, and resizer", () => {
    render(<ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />);

    // Drag handle + add/remove section aria-labels
    expect(
      screen.getByRole("button", { name: "Drag to reorder Professional Experience" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add item to Professional Experience" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Professional Experience section" })
    ).toBeInTheDocument();

    // Primary + secondary lines in Experience & Skills item rows (checking editor cards specifically)
    expect(
      screen.getByText("Principal Engineer · Jan 2021 – Present · San Francisco, CA")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Level 5/5 · React, Accessibility")
    ).toBeInTheDocument();

    // Item action buttons with aria-labels
    expect(screen.getByRole("button", { name: "Hide Acme Corp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Acme Corp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Acme Corp" })).toBeInTheDocument();

    // Toggle item visibility from undefined -> false (Hidden) -> true
    fireEvent.click(screen.getByRole("button", { name: "Hide Acme Corp" }));
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Acme Corp" })).toBeInTheDocument();

    // Split-pane resizer is present
    expect(screen.getByTestId("panel-resize-handle")).toBeInTheDocument();

    // Add Content button opens modal with working search filter
    fireEvent.click(screen.getByRole("button", { name: /add content/i }));
    const searchInput = screen.getByPlaceholderText("Search sections...");
    fireEvent.change(searchInput, { target: { value: "Publications" } });
    expect(screen.getByText("Publications")).toBeInTheDocument();
    expect(screen.queryByText("Languages")).not.toBeInTheDocument();
  });

  it("preserves startDate and endDate independently in EducationForm", () => {
    const onSave = jest.fn();
    render(
      <EducationForm
        initialContent={{
          id: "edu-1",
          degree: "B.S. Computer Science",
          field: "MIT",
          startDate: { month: "Sep", year: "2018" },
          endDate: { month: "May", year: "2022" },
          current: false,
          location: "Cambridge, MA",
          description: "",
        }}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    // Change End Date month from May -> Jun without clobbering End Date year with Start Date year
    fireEvent.click(screen.getByText("May"));
    fireEvent.click(screen.getByText("June"));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: { month: "Sep", year: "2018" },
        endDate: { month: "Jun", year: "2022" },
      })
    );
  });

  it("normalizes missing basics fields and formats display lines cleanly", () => {
    const normalized = normalizeResume({
      title: "Minimal",
      summary: "Top summary",
      content: {
        basics: {},
        sections: [],
        sectionOrder: [],
      },
    });
    expect(normalized.content.basics.summary).toBe("Top summary");
    expect(normalized.content.basics.name).toBe("");

    expect(
      getItemDisplayLines(SectionType.WORK, {
        company: "Globex",
        position: "Tech Lead",
        startDate: { month: "Mar", year: "2020" },
        endDate: { month: "Aug", year: "2023" },
      })
    ).toEqual({
      primary: "Globex",
      secondary: "Tech Lead · Mar 2020 – Aug 2023",
    });
  });

  it("initializes new work experience items with empty string startDate and endDate and previews cleanly", async () => {
    (resumeService.updateResume as jest.Mock).mockResolvedValueOnce({
      _id: "res-101",
    });

    render(<ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add item to Professional Experience" })
    );

    const dialog = screen.getByRole("dialog", { name: "Professional Experience" });
    const startDateInput = within(dialog).getByLabelText("Start Date") as HTMLInputElement;
    const endDateInput = within(dialog).getByLabelText("End Date") as HTMLInputElement;

    expect(startDateInput.value).toBe("");
    expect(endDateInput.value).toBe("");

    fireEvent.change(within(dialog).getByLabelText("Company"), {
      target: { value: "Initech" },
    });
    fireEvent.change(within(dialog).getByLabelText("Position / Role"), {
      target: { value: "Staff Engineer" },
    });

    // Save with untouched empty dates and verify startDate/endDate are persisted as "" strings (not {})
    fireEvent.click(within(dialog).getByRole("button", { name: /^save$/i }));
    const toolbar = screen.getByTestId("resume-editor-toolbar");
    fireEvent.click(within(toolbar).getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(resumeService.updateResume).toHaveBeenCalledTimes(1);
    });

    const savedPayload = (resumeService.updateResume as jest.Mock).mock.calls[0][1];
    const workSection = savedPayload.content.sections.find(
      (s: any) => s.id === "sec-work-1"
    );
    const createdWorkItem = workSection.content.find(
      (item: any) => item.company === "Initech"
    );

    expect(createdWorkItem).toBeDefined();
    expect(createdWorkItem.startDate).toBe("");
    expect(createdWorkItem.endDate).toBe("");
    expect(typeof createdWorkItem.startDate).toBe("string");
    expect(typeof createdWorkItem.endDate).toBe("string");
  });
});

describe("ResumeEditor autosave, toolbar status indicator, flush, and serialization", () => {
  let toastErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    toastErrorSpy = jest.spyOn(toast, "error").mockImplementation(() => "toast-id");
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    toastErrorSpy.mockRestore();
  });

  it("shows 'Not saved yet' for new resumes without _id, does not autosave, and enables autosave after manual Save creates it", async () => {
    let resolveCreate!: (val: any) => void;
    (resumeService.createResume as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    (resumeService.updateResume as jest.Mock).mockResolvedValue({
      _id: "created-res-1",
    });

    render(<ResumeEditor onBack={jest.fn()} />);

    expect(screen.getByTestId("save-status-indicator")).toHaveTextContent(
      "Not saved yet"
    );

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Ada Lovelace" } });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(resumeService.updateResume).not.toHaveBeenCalled();
    expect(resumeService.createResume).not.toHaveBeenCalled();
    expect(screen.getByTestId("save-status-indicator")).toHaveTextContent(
      "Not saved yet"
    );

    // First manual Save creates the resume
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(screen.getByTestId("save-status-indicator")).toHaveTextContent(
      "Saving…"
    );
    expect(resumeService.createResume).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({ _id: "created-res-1", title: "Untitled Resume" });
    });

    expect(screen.getByTestId("save-status-indicator")).toHaveTextContent(
      "All changes saved"
    );

    // Subsequent edits now autosave using the created _id
    fireEvent.change(nameInput, { target: { value: "Ada King" } });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);
    expect(resumeService.updateResume).toHaveBeenCalledWith(
      "created-res-1",
      expect.objectContaining({
        _id: "created-res-1",
        content: expect.objectContaining({
          basics: expect.objectContaining({ name: "Ada King" }),
        }),
      })
    );
  });

  it("shows 'Save failed - Retry' on autosave failure, shows error toast once across keystrokes, and retries on click", async () => {
    (resumeService.updateResume as jest.Mock)
      .mockRejectedValueOnce(new Error("Network down"))
      .mockRejectedValueOnce(new Error("Still down"));

    render(<ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />);

    expect(screen.getByTestId("save-status-indicator")).toHaveTextContent(
      "All changes saved"
    );

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Jordan V1" } });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Save failed - Retry")).toBeInTheDocument();
    expect(toastErrorSpy).toHaveBeenCalledTimes(1);

    // Further keystrokes keep indicator in failed state and do not spam toast
    fireEvent.change(nameInput, { target: { value: "Jordan V2" } });
    expect(screen.getByText("Save failed - Retry")).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Jordan V3" } });
    expect(screen.getByText("Save failed - Retry")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Save failed - Retry")).toBeInTheDocument();
    expect(toastErrorSpy).toHaveBeenCalledTimes(1);

    // Clicking Retry immediately triggers a save, shows Saving…, then All changes saved
    let resolveRetry!: (val: any) => void;
    (resumeService.updateResume as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve;
        })
    );

    fireEvent.click(screen.getByRole("button", { name: /Save failed - Retry/i }));
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(resumeService.updateResume).toHaveBeenCalledTimes(3);
    expect(resumeService.updateResume).toHaveBeenLastCalledWith(
      "res-101",
      expect.objectContaining({
        content: expect.objectContaining({
          basics: expect.objectContaining({ name: "Jordan V3" }),
        }),
      })
    );

    await act(async () => {
      resolveRetry({ _id: "res-101" });
    });

    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("flushes pending debounced save on unmount instead of cancelling it", async () => {
    (resumeService.updateResume as jest.Mock).mockResolvedValueOnce({
      _id: "res-101",
    });

    const { unmount } = render(
      <ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />
    );

    const summaryTextarea = screen.getByLabelText("Professional Summary");
    fireEvent.change(summaryTextarea, {
      target: { value: "Edited right before unmount" },
    });

    // Advance less than debounce window so timer is still pending
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(resumeService.updateResume).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });

    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);
    expect(resumeService.updateResume).toHaveBeenCalledWith(
      "res-101",
      expect.objectContaining({
        summary: "Edited right before unmount",
      })
    );
  });

  it("flushes pending save on beforeunload and warns only when there are unsaved changes", async () => {
    let resolveSave!: (val: any) => void;
    (resumeService.updateResume as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );

    render(<ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />);

    // Clean state: should NOT warn on beforeunload
    const cleanUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanUnload);
    expect(cleanUnload.defaultPrevented).toBe(false);
    expect(resumeService.updateResume).not.toHaveBeenCalled();

    // Dirty state with pending debounce: flushes save AND warns on beforeunload
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Unsaved Name" },
    });

    const dirtyUnload = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(dirtyUnload);
    });

    expect(dirtyUnload.defaultPrevented).toBe(true);
    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);

    // Once in-flight save completes, beforeunload no longer warns
    await act(async () => {
      resolveSave({ _id: "res-101" });
    });

    const savedUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(savedUnload);
    expect(savedUnload.defaultPrevented).toBe(false);
  });

  it("cancels pending debounce on manual Save and serializes concurrent saves with latest queued state", async () => {
    let resolveFirst!: (val: any) => void;
    let resolveSecond!: (val: any) => void;
    (resumeService.updateResume as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    render(<ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />);

    const nameInput = screen.getByLabelText("Full Name");

    // 1. Trigger first autosave so an updateResume call is in-flight
    fireEvent.change(nameInput, { target: { value: "State 1" } });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    // 2. While first call is still in-flight, make intermediate + latest edits and click manual Save
    fireEvent.change(nameInput, { target: { value: "State 2" } });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // Autosave queued State 2, still NOT running concurrently
    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);

    // User edits again to State 3 and clicks manual Save (cancelling pending debounce & overwriting queue with State 3)
    fireEvent.change(nameInput, { target: { value: "State 3" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    // Must still only have 1 in-flight call
    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);

    // 3. Resolve first call -> queued latest state (State 3, skipping State 2) starts immediately
    await act(async () => {
      resolveFirst({ _id: "res-101" });
    });

    expect(resumeService.updateResume).toHaveBeenCalledTimes(2);
    expect(resumeService.updateResume).toHaveBeenNthCalledWith(
      2,
      "res-101",
      expect.objectContaining({
        content: expect.objectContaining({
          basics: expect.objectContaining({ name: "State 3" }),
        }),
      })
    );

    // 4. Resolve second call -> All changes saved, and advancing timers further fires no extra save
    await act(async () => {
      resolveSecond({ _id: "res-101" });
    });

    expect(screen.getByText("All changes saved")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(resumeService.updateResume).toHaveBeenCalledTimes(2);
  });

  it("renders the document toolbar full-width above the split-pane panels so long resume titles are not constrained to the left panel", () => {
    const longTitle = "Senior Staff Frontend & Design Systems Engineer Resume";
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    try {
      const { unmount } = render(
        <ResumeEditor
          initialResume={buildSampleResume({ title: longTitle })}
          onBack={jest.fn()}
        />
      );

      const toolbar = screen.getByTestId("resume-editor-toolbar");
      const resizeHandle = screen.getByTestId("panel-resize-handle");
      const splitPanelGroup = resizeHandle.parentElement!;

      // Toolbar sits outside and above the split-pane PanelGroup rather than inside the 55% left panel
      expect(splitPanelGroup.contains(toolbar)).toBe(false);
      expect(
        toolbar.compareDocumentPosition(splitPanelGroup) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      const heading = within(toolbar).getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(longTitle);
      expect(heading).toHaveAttribute("title", longTitle);
      expect(within(toolbar).getByTestId("save-status-indicator")).toHaveTextContent(
        "All changes saved"
      );

      unmount();

      // On narrow/mobile viewports, switching to Preview keeps the document toolbar visible
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ResumeEditor
          initialResume={buildSampleResume({ title: longTitle })}
          onBack={jest.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /^preview$/i }));
      expect(screen.getByTestId("resume-editor-toolbar")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: longTitle })).toBeInTheDocument();
      expect(screen.getByTestId("save-status-indicator")).toHaveTextContent(
        "All changes saved"
      );
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

describe("ResumeEditor toolbar export handler (desktop & mobile)", () => {
  const originalMatchMedia = window.matchMedia;
  const originalPrint = window.print;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let printSpy: jest.Mock;
  let anchorClickSpy: jest.SpyInstance;

  const mockViewport = (isDesktopViewport: boolean) => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: isDesktopViewport,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => "blob:http://localhost/mock-pdf");
    URL.revokeObjectURL = jest.fn();
    anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    (resumeService.exportResumePdf as jest.Mock).mockResolvedValue({
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      filename: "staff-frontend-resume.pdf",
    });
    printSpy = jest.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      writable: true,
      value: printSpy,
    });
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "print", {
      configurable: true,
      writable: true,
      value: originalPrint,
    });
  });

  it("triggers server-side PDF export when clicking the desktop toolbar Export PDF button and closes the overflow menu", async () => {
    mockViewport(true);

    render(
      <ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />
    );

    expect(screen.getByTestId("resume-preview-page")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    const exportBtn = screen.getByRole("menuitem", { name: /export pdf/i });
    fireEvent.click(exportBtn);

    expect(
      screen.queryByRole("menuitem", { name: /export pdf/i })
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(resumeService.exportResumePdf).toHaveBeenCalledWith(
        "res-101",
        "Staff Frontend Resume"
      );
    });
    expect(printSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("resume-preview-page")).toBeInTheDocument();
  });

  it("switches activeView to preview mode before starting server-side PDF export when clicking Export PDF on mobile from the Editor tab", async () => {
    mockViewport(false);

    let previewMountedDuringExport = false;
    (resumeService.exportResumePdf as jest.Mock).mockImplementationOnce(
      async () => {
        previewMountedDuringExport = Boolean(
          document.querySelector('[data-testid="resume-preview-page"]')
        );
        return {
          blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
          filename: "staff-frontend-resume.pdf",
        };
      }
    );

    render(
      <ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />
    );

    // Initially on mobile Editor tab: preview page is not mounted
    expect(
      screen.queryByTestId("resume-preview-page")
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    fireEvent.click(screen.getByRole("menuitem", { name: /export pdf/i }));

    await waitFor(() => {
      expect(resumeService.exportResumePdf).toHaveBeenCalledTimes(1);
    });
    expect(previewMountedDuringExport).toBe(true);
    expect(printSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("resume-preview-page")).toBeInTheDocument();
    expect(screen.queryByLabelText("Full Name")).not.toBeInTheDocument();
  });

  it("exports PDF directly on mobile when Preview tab is already active", async () => {
    mockViewport(false);

    render(
      <ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /^preview$/i }));
    expect(screen.getByTestId("resume-preview-page")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    fireEvent.click(screen.getByRole("menuitem", { name: /export pdf/i }));

    await waitFor(() => {
      expect(resumeService.exportResumePdf).toHaveBeenCalledTimes(1);
    });
    expect(printSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("resume-preview-page")).toBeInTheDocument();
  });

  it("disables and blocks repeated Export PDF clicks while server export is in flight, then re-enables on completion", async () => {
    mockViewport(true);

    let resolveExport!: (val: { blob: Blob; filename: string }) => void;
    (resumeService.exportResumePdf as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveExport = resolve;
        })
    );

    render(
      <ResumeEditor initialResume={buildSampleResume()} onBack={jest.fn()} />
    );

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    const firstExportBtn = screen.getByRole("menuitem", { name: /export pdf/i });

    // Rapid double-click on the same button instance
    fireEvent.click(firstExportBtn);
    fireEvent.click(firstExportBtn);
    expect(resumeService.exportResumePdf).toHaveBeenCalledTimes(1);

    // Re-opening overflow menu while export is in flight shows Export PDF disabled and blocks click
    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    const inFlightExportBtn = screen.getByRole("menuitem", {
      name: /export pdf/i,
    });
    expect(inFlightExportBtn).toBeDisabled();
    fireEvent.click(inFlightExportBtn);
    expect(resumeService.exportResumePdf).toHaveBeenCalledTimes(1);

    // Once export completes, Export PDF re-enables and allows exporting again
    await act(async () => {
      resolveExport({
        blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
        filename: "staff-frontend-resume.pdf",
      });
    });

    expect(inFlightExportBtn).not.toBeDisabled();
    fireEvent.click(inFlightExportBtn);
    await waitFor(() => {
      expect(resumeService.exportResumePdf).toHaveBeenCalledTimes(2);
    });
  });
});
