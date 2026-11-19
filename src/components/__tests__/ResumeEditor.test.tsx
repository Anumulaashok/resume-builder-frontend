import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
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
});
