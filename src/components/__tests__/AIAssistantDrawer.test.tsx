import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import axiosInstance from "../../services/axios";
import { resumeService } from "../../services/resume.service";
import ResumeEditor from "../ResumeEditor";
import { IResume, SectionType } from "../../types/resume";
import { maskPII } from "../../utils/piiMasker";

jest.mock("../../services/axios", () => ({
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

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  Toaster: () => null,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

const buildEditorResume = (): IResume => ({
  _id: "res-ai-1",
  title: "Senior Backend Engineer",
  summary: "Backend developer working on web services.",
  content: {
    basics: {
      name: "Elena Rostova",
      label: "Senior Backend Engineer",
      email: "elena.rostova@private.io",
      phone: "415-555-0142",
      summary: "Backend developer working on web services.",
      location: {
        address: "742 Evergreen Terrace",
        city: "San Francisco",
        countryCode: "US",
      },
    },
    sections: [
      {
        id: "sec-work",
        type: SectionType.WORK,
        title: "Professional Experience",
        content: [
          {
            id: "w-1",
            name: "Nimbus Cloud",
            position: "Senior Backend Engineer",
            startDate: "2021",
            current: true,
            description:
              "• Built billing APIs in Go\n• Improved PostgreSQL query speed",
          },
        ],
      },
    ],
    sectionOrder: ["sec-work"],
  },
});

describe("Client PII Masking & Prompt Guardrails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("masks emails, phones, SSNs, street addresses, and known user identifiers while preserving career facts", () => {
    const raw =
      "Elena Rostova (elena.rostova@private.io, +1 (415) 555-0142, SSN 123-45-6789, 742 Evergreen Terrace) led Go microservices from 2020 - 2024 reducing p99 latency by 45%.";

    const masked = maskPII(raw, {
      name: "Elena Rostova",
      email: "elena.rostova@private.io",
      phone: "415-555-0142",
      address: "742 Evergreen Terrace",
    });

    expect(masked).not.toContain("Elena Rostova");
    expect(masked).not.toContain("elena.rostova@private.io");
    expect(masked).not.toContain("555-0142");
    expect(masked).not.toContain("123-45-6789");
    expect(masked).not.toContain("742 Evergreen Terrace");
    expect(masked).toContain("[NAME]");
    expect(masked).toContain("[EMAIL]");
    expect(masked).toContain("[SSN]");
    expect(masked).toContain("2020 - 2024");
    expect(masked).toContain("45%");
  });

  it("masks PII in outbound generateResume, generateSummary, and optimizeBullet requests and rejects >2000 char prompts", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { _id: "r-new", title: "Go Engineer", content: { basics: {}, sections: [], sectionOrder: [] } },
      },
    } as any);

    await resumeService.generateResume(
      "Reach me at jane.personal@gmail.com or 212-555-0188. Senior Go Engineer.",
      { name: "Jane Smith", email: "jane.personal@gmail.com" }
    );

    expect(mockedAxios.post).toHaveBeenCalledWith("/api/resumes/generate", {
      prompt: "Reach me at [EMAIL] or [PHONE]. Senior Go Engineer.",
      basics: { name: "Jane Smith", email: "jane.personal@gmail.com" },
    });

    await expect(
      resumeService.generateResume("x".repeat(2001))
    ).rejects.toThrow(/cannot exceed 2000 characters/i);
  });
});

describe("Editor AI Assistant Drawer (Summary Generation & Bullet Optimization)", () => {
  const originalResizeObserver = (window as any).ResizeObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    (window as any).ResizeObserver = originalResizeObserver;
  });

  it("generates summaries in the AI Assistant drawer, previews suggested changes, supports Discard, and inserts into active resume on Apply", async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          summary:
            "Senior Backend Engineer with 6+ years architecting resilient Go microservices and low-latency billing systems.",
          suggestions: [
            "Senior Backend Engineer with 6+ years architecting resilient Go microservices and low-latency billing systems.",
            "Distributed Systems Engineer focused on high-throughput payment infrastructure and PostgreSQL optimization.",
            "Platform-minded Backend Lead delivering 99.99% SLA cloud services.",
          ],
        },
      },
    } as any);

    render(<ResumeEditor initialResume={buildEditorResume()} onBack={jest.fn()} />);

    // Open drawer from toolbar button
    fireEvent.click(screen.getByTestId("ai-assistant-toggle-btn"));
    expect(screen.getByTestId("ai-assistant-drawer")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Summary Generation/i })
    ).toHaveAttribute("aria-selected", "true");

    // Enter highlights containing PII to verify client-side masking
    const promptTextarea = screen.getByLabelText(/Career Highlights & Focus/i);
    fireEvent.change(promptTextarea, {
      target: {
        value:
          "6 years Go & PostgreSQL experience. Contact elena.rostova@private.io",
      },
    });

    fireEvent.click(screen.getByTestId("generate-summary-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("summary-preview-card")).toBeInTheDocument();
    });

    // Verify PII was masked in outbound request
    const sentPayload = mockedAxios.post.mock.calls[0][1] as any;
    expect(sentPayload.prompt).not.toContain("elena.rostova@private.io");
    expect(sentPayload.prompt).toContain("[EMAIL]");

    // Discard leaves existing resume summary untouched
    fireEvent.click(screen.getByTestId("discard-summary-btn"));
    expect(screen.queryByTestId("summary-preview-card")).not.toBeInTheDocument();
    expect(
      (screen.getByLabelText("Professional Summary") as HTMLTextAreaElement)
        .value
    ).toBe("Backend developer working on web services.");

    // Generate again, select Option 2, and Apply with one click
    fireEvent.click(screen.getByTestId("generate-summary-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("summary-preview-card")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Option 2" }));
    expect(screen.getByTestId("suggested-summary-text")).toHaveTextContent(
      "Distributed Systems Engineer focused on high-throughput payment infrastructure and PostgreSQL optimization."
    );

    fireEvent.click(screen.getByTestId("apply-summary-btn"));

    expect(
      (screen.getByLabelText("Professional Summary") as HTMLTextAreaElement)
        .value
    ).toBe(
      "Distributed Systems Engineer focused on high-throughput payment infrastructure and PostgreSQL optimization."
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Summary inserted into active resume!"
    );
  });

  it("opens Bullet Optimization tab for a selected experience item, displays 3 refined versions, and updates the bullet immediately on Apply", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          suggestions: [
            "Architected fault-tolerant Go billing APIs processing $40M+ in annual recurring revenue with 99.99% uptime",
            "Engineered idempotent Go payment microservices, reducing billing reconciliation incidents by 65%",
            "Designed horizontally scalable Go REST & gRPC billing endpoints serving 8,500 requests per second",
          ],
        },
      },
    } as any);

    render(<ResumeEditor initialResume={buildEditorResume()} onBack={jest.fn()} />);

    // Click item-level AI bullet refine button on "Nimbus Cloud"
    fireEvent.click(
      screen.getByRole("button", { name: "Optimize bullets for Nimbus Cloud" })
    );

    expect(screen.getByTestId("ai-assistant-drawer")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Bullet Optimization/i })
    ).toHaveAttribute("aria-selected", "true");

    // First bullet of Nimbus Cloud is pre-selected
    const bulletInput = screen.getByLabelText(
      /Bullet Point to Refine/i
    ) as HTMLTextAreaElement;
    expect(bulletInput.value).toBe("Built billing APIs in Go");

    fireEvent.click(screen.getByTestId("optimize-bullet-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("bullet-suggestions-list")).toBeInTheDocument();
    });

    // Displays 3 refined versions
    expect(screen.getByTestId("bullet-suggestion-card-0")).toBeInTheDocument();
    expect(screen.getByTestId("bullet-suggestion-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("bullet-suggestion-card-2")).toBeInTheDocument();

    // Discard Version 3 -> 2 remain
    fireEvent.click(screen.getByTestId("discard-bullet-btn-2"));
    expect(
      screen.queryByTestId("bullet-suggestion-card-2")
    ).not.toBeInTheDocument();

    // Apply Version 2 (index 1) -> updates the bullet in the resume immediately while keeping second line intact
    fireEvent.click(screen.getByTestId("apply-bullet-btn-1"));

    expect(toast.success).toHaveBeenCalledWith("Bullet point updated!");

    // Verify live resume preview reflects the updated bullet immediately
    const previewPage = screen.getByTestId("resume-preview-page");
    expect(
      within(previewPage).getByText(
        /Engineered idempotent Go payment microservices, reducing billing reconciliation incidents by 65%/
      )
    ).toBeInTheDocument();
    expect(
      within(previewPage).getByText(/Improved PostgreSQL query speed/)
    ).toBeInTheDocument();
  });

  it("displays graceful error message when upstream AI provider fails and disables >2000 character prompts", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      new Error("AI service is temporarily unavailable. Please try again in a moment.")
    );

    render(<ResumeEditor initialResume={buildEditorResume()} onBack={jest.fn()} />);

    fireEvent.click(screen.getByTestId("open-ai-summary-btn"));

    const promptTextarea = screen.getByLabelText(/Career Highlights & Focus/i);
    // Exceeding 2000 characters disables Generate Summary button
    fireEvent.change(promptTextarea, { target: { value: "a".repeat(2001) } });
    expect(screen.getByTestId("generate-summary-btn")).toBeDisabled();

    // Valid length triggers request and shows graceful error alert on failure
    fireEvent.change(promptTextarea, {
      target: { value: "Distributed backend systems" },
    });
    expect(screen.getByTestId("generate-summary-btn")).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("generate-summary-btn"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "AI service is temporarily unavailable. Please try again in a moment."
      );
    });
  });
});
