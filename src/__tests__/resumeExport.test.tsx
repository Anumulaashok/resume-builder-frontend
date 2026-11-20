import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import ResumeEditor from "../components/ResumeEditor";
import ResumePreview from "../components/ResumePreview";
import { resumeService } from "../services/resume.service";
import axiosInstance from "../services/axios";
import {
  buildFallbackExportFilename,
  parseContentDispositionFilename,
} from "../utils/download";
import { templateRegistry } from "../components/templates/registry";
import { sampleResume as fullSampleResume } from "../components/templates/sampleResume";
import { ModernTemplate } from "../components/templates/ModernTemplate";
import { ProfessionalTemplate } from "../components/templates/ProfessionalTemplate";
import { MinimalTemplate } from "../components/templates/MinimalTemplate";
import { TechSplitTemplate } from "../components/templates/TechSplitTemplate";
import { ExecutiveTwoColumnTemplate } from "../components/templates/ExecutiveTwoColumnTemplate";
import { ClassicTemplate } from "../components/templates/ClassicTemplate";
import { ExecutiveTemplate } from "../components/templates/ExecutiveTemplate";
import { CompactTemplate } from "../components/templates/CompactTemplate";
import { BoldHeaderTemplate } from "../components/templates/BoldHeaderTemplate";
import { AccentSidebarTemplate } from "../components/templates/AccentSidebarTemplate";
import { StartupTemplate } from "../components/templates/StartupTemplate";
import { CreativeSidebarTemplate } from "../components/templates/CreativeSidebarTemplate";
import { TimelineTemplate } from "../components/templates/TimelineTemplate";
import { AcademicTemplate } from "../components/templates/AcademicTemplate";
import { IResume, SectionType } from "../types/resume";

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

const sampleResume: IResume = {
  _id: "res-export-1",
  title: "Staff Backend Resume",
  templateId: "tech-split",
  content: {
    basics: {
      name: "Anumula Ashok",
      label: "Senior Backend Engineer",
      email: "ashok@example.com",
      phone: "+1-555-0100",
      summary: "Distributed systems & AI infrastructure engineer.",
      location: {
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
            id: "w1",
            name: "RagaAI",
            position: "Software Development Engineer",
            startDate: "Dec 2025",
            current: true,
            description: "Built Temporal orchestration workflows.",
          },
        ],
      },
    ],
    sectionOrder: ["sec-work"],
  },
};

describe("Vector PDF, OpenXML DOCX, Plain-Text (.txt) Exports & Unified Print Pagination", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let toastErrorSpy: jest.SpyInstance;
  let toastSuccessSpy: jest.SpyInstance;
  let printSpy: jest.SpyInstance;
  let anchorClickSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    URL.createObjectURL = jest.fn(() => "blob:http://localhost/mock-export-file");
    URL.revokeObjectURL = jest.fn();
    toastErrorSpy = jest.spyOn(toast, "error").mockImplementation(() => "err-id");
    toastSuccessSpy = jest.spyOn(toast, "success").mockImplementation(() => "ok-id");
    printSpy = jest.spyOn(window, "print").mockImplementation(() => undefined);
    anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('downloads vector PDF, editable DOCX, and ATS .txt from ResumePreview while keeping secondary Print for window.print()', async () => {
    const exportPdfSpy = jest
      .spyOn(resumeService, "exportResumePdf")
      .mockResolvedValueOnce({
        blob: new Blob(["%PDF-1.7\n"], { type: "application/pdf" }),
        filename: "staff-backend-resume.pdf",
      });
    const exportDocxSpy = jest
      .spyOn(resumeService, "exportResumeDocx")
      .mockResolvedValueOnce({
        blob: new Blob(["PK\x03\x04"], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        filename: "staff-backend-resume.docx",
      });

    let resolveTxt!: (val: { blob: Blob; filename: string }) => void;
    const exportTxtSpy = jest
      .spyOn(resumeService, "exportResumeTxt")
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveTxt = resolve;
          })
      );

    render(<ResumePreview resume={sampleResume} />);

    const pdfBtn = screen.getByTestId("export-pdf-btn");
    const docxBtn = screen.getByTestId("export-docx-btn");
    const txtBtn = screen.getByTestId("export-txt-btn");
    const printBtn = screen.getByTestId("print-resume-btn");
    const previewPage = screen.getByTestId("resume-preview-page");

    expect(pdfBtn).toHaveTextContent("Download PDF");
    expect(docxBtn).toHaveTextContent("Download DOCX");
    expect(txtBtn).toHaveTextContent("Download ATS text");
    expect(printBtn).toHaveTextContent("Print");
    expect(previewPage.className).toContain("print:!transform-none");

    // Download PDF calls backend .pdf endpoint directly (does NOT call window.print)
    fireEvent.click(pdfBtn);
    await waitFor(() => {
      expect(exportPdfSpy).toHaveBeenCalledWith(
        "res-export-1",
        "Staff Backend Resume"
      );
    });
    expect(printSpy).not.toHaveBeenCalled();
    expect(toastSuccessSpy).toHaveBeenCalledWith("PDF resume downloaded");

    // Download DOCX calls backend .docx endpoint directly
    fireEvent.click(docxBtn);
    await waitFor(() => {
      expect(exportDocxSpy).toHaveBeenCalledWith(
        "res-export-1",
        "Staff Backend Resume"
      );
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith("DOCX resume downloaded");

    // Secondary Print triggers window.print()
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);

    // Download ATS text calls backend .txt endpoint and saves the file
    fireEvent.click(txtBtn);
    expect(exportTxtSpy).toHaveBeenCalledWith(
      "res-export-1",
      "Staff Backend Resume"
    );
    expect(txtBtn).toHaveTextContent("Exporting TXT…");
    expect(txtBtn).toBeDisabled();

    await act(async () => {
      resolveTxt({
        blob: new Blob(["Anumula Ashok\nWORK EXPERIENCE\n"], {
          type: "text/plain;charset=utf-8",
        }),
        filename: "staff-backend-resume.txt",
      });
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
    expect(anchorClickSpy).toHaveBeenCalledTimes(3);
    expect(toastSuccessSpy).toHaveBeenCalledWith("ATS plain text downloaded");
    expect(txtBtn).toHaveTextContent("Download ATS text");
    expect(txtBtn).not.toBeDisabled();
  });

  it("flushes unsaved edits in ResumeEditor before downloading PDF, DOCX, and ATS text", async () => {
    const updateSpy = jest
      .spyOn(resumeService, "updateResume")
      .mockResolvedValue({ _id: "res-export-1" } as any);
    const exportPdfSpy = jest
      .spyOn(resumeService, "exportResumePdf")
      .mockResolvedValueOnce({
        blob: new Blob(["%PDF-1.7\n"], { type: "application/pdf" }),
        filename: "staff-backend-resume.pdf",
      });
    const exportDocxSpy = jest
      .spyOn(resumeService, "exportResumeDocx")
      .mockResolvedValueOnce({
        blob: new Blob(["PK\x03\x04"], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        filename: "staff-backend-resume.docx",
      });
    const exportTxtSpy = jest
      .spyOn(resumeService, "exportResumeTxt")
      .mockResolvedValueOnce({
        blob: new Blob(["Anumula Ashok\nWORK EXPERIENCE\n"], {
          type: "text/plain;charset=utf-8",
        }),
        filename: "staff-backend-resume.txt",
      });

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    // Dirty edit #1 -> Download PDF flushes save first
    fireEvent.change(screen.getByLabelText("Professional Title"), {
      target: { value: "Principal Distributed Systems Engineer" },
    });
    fireEvent.click(screen.getByTestId("export-pdf-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(exportPdfSpy).toHaveBeenCalledWith(
        "res-export-1",
        "Staff Backend Resume"
      );
    });

    // Dirty edit #2 -> Download DOCX flushes save first
    fireEvent.change(screen.getByLabelText("Professional Title"), {
      target: { value: "Distinguished Backend Architect" },
    });
    fireEvent.click(screen.getByTestId("export-docx-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(exportDocxSpy).toHaveBeenCalledWith(
        "res-export-1",
        "Staff Backend Resume"
      );
    });

    // Dirty edit #3 -> Download ATS text flushes save first
    fireEvent.change(screen.getByLabelText("Professional Title"), {
      target: { value: "VP of Infrastructure" },
    });
    fireEvent.click(screen.getByTestId("export-txt-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(3);
      expect(exportTxtSpy).toHaveBeenCalledWith(
        "res-export-1",
        "Staff Backend Resume"
      );
    });

    expect(anchorClickSpy).toHaveBeenCalledTimes(3);
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("aborts PDF/DOCX export and displays an actionable error toast when saving pending edits fails", async () => {
    jest
      .spyOn(resumeService, "updateResume")
      .mockRejectedValue(new Error("Network timeout"));
    const exportPdfSpy = jest.spyOn(resumeService, "exportResumePdf");
    const exportDocxSpy = jest.spyOn(resumeService, "exportResumeDocx");

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("Professional Title"), {
      target: { value: "Unsaved Failing Edit" },
    });

    fireEvent.click(screen.getByTestId("export-pdf-btn"));

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /could not save your latest changes before downloading pdf/i
        )
      );
    });
    expect(exportPdfSpy).not.toHaveBeenCalled();

    toastErrorSpy.mockClear();

    fireEvent.click(screen.getByTestId("export-docx-btn"));

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /could not save your latest changes before downloading docx/i
        )
      );
    });
    expect(exportDocxSpy).not.toHaveBeenCalled();
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("persists a brand-new unsaved resume before downloading DOCX from the editor overflow menu", async () => {
    const createSpy = jest
      .spyOn(resumeService, "createResume")
      .mockResolvedValueOnce({
        data: { _id: "newly-created-id-99" },
      } as any);
    const exportDocxSpy = jest
      .spyOn(resumeService, "exportResumeDocx")
      .mockResolvedValueOnce({
        blob: new Blob(["PK\x03\x04"], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        filename: "untitled-resume.docx",
      });

    render(<ResumeEditor onBack={jest.fn()} />);

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    fireEvent.click(screen.getByTestId("export-docx-menu-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(exportDocxSpy).toHaveBeenCalledWith(
        "newly-created-id-99",
        "Untitled Resume"
      );
    });

    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("synchronizes document.title with the active resume title in ResumeEditor and restores it on unmount", () => {
    const previousTitle = document.title;
    document.title = "Smart CV & Portfolio";

    const { unmount } = render(
      <ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />
    );

    expect(document.title).toBe("Staff Backend Resume");

    // Rename resume inline and verify document.title updates dynamically
    fireEvent.click(screen.getByTestId("resume-title-heading"));
    const titleInput = screen.getByLabelText("Resume Title");
    fireEvent.change(titleInput, {
      target: { value: "Principal Platform CV" },
    });
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(document.title).toBe("Principal Platform CV");

    unmount();
    expect(document.title).toBe("Smart CV & Portfolio");
    document.title = previousTitle;
  });

  it("requests .pdf, .docx, and .txt endpoints (authenticated and shared) and builds slugified fallback filenames", async () => {
    const getSpy = jest
      .spyOn(axiosInstance, "get")
      .mockResolvedValueOnce({
        data: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
        headers: {
          "content-disposition": 'attachment; filename="staff-engineer.pdf"',
        },
      } as any)
      .mockResolvedValueOnce({
        data: new Blob(["PK\x03\x04"], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        headers: {
          "content-disposition": 'attachment; filename="staff-engineer.docx"',
        },
      } as any)
      .mockResolvedValueOnce({
        data: new Blob(["Anumula Ashok\n"], { type: "text/plain;charset=utf-8" }),
        headers: {
          "content-disposition": 'attachment; filename="staff-engineer.txt"',
        },
      } as any)
      .mockResolvedValueOnce({
        data: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
        headers: {},
      } as any)
      .mockResolvedValueOnce({
        data: new Blob(["PK\x03\x04"], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        headers: {},
      } as any);

    const exportedPdf = await resumeService.exportResumePdf(
      "507f1f77bcf86cd799439022",
      "Fallback Title"
    );
    expect(getSpy).toHaveBeenNthCalledWith(
      1,
      "/api/resumes/507f1f77bcf86cd799439022/export.pdf",
      { responseType: "blob" }
    );
    expect(exportedPdf.filename).toBe("staff-engineer.pdf");

    const exportedDocx = await resumeService.exportResumeDocx(
      "507f1f77bcf86cd799439022",
      "Fallback Title"
    );
    expect(getSpy).toHaveBeenNthCalledWith(
      2,
      "/api/resumes/507f1f77bcf86cd799439022/export.docx",
      { responseType: "blob" }
    );
    expect(exportedDocx.filename).toBe("staff-engineer.docx");

    const exportedTxt = await resumeService.exportResumeTxt(
      "507f1f77bcf86cd799439022",
      "Fallback Title"
    );
    expect(getSpy).toHaveBeenNthCalledWith(
      3,
      "/api/resumes/507f1f77bcf86cd799439022/export.txt",
      { responseType: "blob" }
    );
    expect(exportedTxt.filename).toBe("staff-engineer.txt");

    const sharedPdf = await resumeService.exportSharedResumePdf({
      shareToken: "tok_abc",
      fallbackTitle: "Staff C++ / Go Resume!",
    });
    expect(getSpy).toHaveBeenNthCalledWith(
      4,
      "/api/resumes/share/tok_abc/export.pdf",
      { responseType: "blob" }
    );
    expect(sharedPdf.filename).toBe("staff-c-go-resume.pdf");

    const slugDocx = await resumeService.exportSharedResumeDocx({
      slug: "maya-lin-cv",
      fallbackTitle: "Maya Lin Resume",
    });
    expect(getSpy).toHaveBeenNthCalledWith(
      5,
      "/api/public/r/maya-lin-cv/export.docx",
      { responseType: "blob" }
    );
    expect(slugDocx.filename).toBe("maya-lin-resume.docx");

    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''ashok%20resume.pdf",
        "fallback.pdf"
      )
    ).toBe("ashok resume.pdf");
    expect(buildFallbackExportFilename("Staff C++ / Go Resume!", "pdf")).toBe(
      "staff-c-go-resume.pdf"
    );
    expect(buildFallbackExportFilename("Staff C++ / Go Resume!", "docx")).toBe(
      "staff-c-go-resume.docx"
    );
    expect(buildFallbackExportFilename("Staff C++ / Go Resume!")).toBe(
      "staff-c-go-resume.txt"
    );

    const errorBlob = {
      text: () =>
        Promise.resolve(
          JSON.stringify({ success: false, message: "Resume not found" })
        ),
    };
    Object.setPrototypeOf(errorBlob, Blob.prototype);

    const failWithBlob = (config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError("Request failed with status code 404", "404", config, null, {
          status: 404,
          statusText: "Not Found",
          headers: {},
          config: { ...config, headers: new AxiosHeaders() },
          data: errorBlob,
        })
      );

    await expect(
      axiosInstance.get("/api/resumes/bad-id/export.pdf", {
        responseType: "blob",
        adapter: failWithBlob,
      })
    ).rejects.toThrow("Resume not found");
  });

  it("marks empty editor-only placeholders and empty summary blocks as print:hidden while keeping populated fields visible for @media print", () => {
    const partialResume: IResume = {
      _id: "res-partial-print",
      title: "Partial Print Resume",
      templateId: "modern",
      content: {
        basics: {
          name: "Anumula Ashok",
          label: "",
          email: "ashok@example.com",
          phone: "",
          summary: "",
        },
        sections: [
          {
            id: "sec-work",
            type: SectionType.WORK,
            title: "Experience",
            content: [
              {
                id: "w1",
                company: "RagaAI",
                position: "Software Engineer",
                startDate: "2025",
                current: true,
                description: "",
                highlights: ["Shipped workflow engine"],
              },
            ],
          },
        ],
        sectionOrder: ["sec-work"],
      },
    };

    render(<ResumePreview resume={partialResume} onChange={jest.fn()} />);

    const phonePlaceholder = screen.getByText("Phone Number");
    expect(phonePlaceholder.closest(".print\\:hidden")).not.toBeNull();

    const labelPlaceholder = screen.getByText("Professional Title");
    expect(labelPlaceholder.closest(".print\\:hidden")).not.toBeNull();

    const summaryHeading = screen.getByText("Professional Summary");
    expect(summaryHeading.closest("section")).toHaveClass("print:hidden");

    const descPlaceholder = screen.getByText(
      "Describe key responsibilities and achievements..."
    );
    expect(descPlaceholder.closest(".print\\:hidden")).not.toBeNull();

    const populatedName = screen.getByText("Anumula Ashok");
    expect(populatedName.closest(".print\\:hidden")).toBeNull();

    const populatedEmail = screen.getByText("ashok@example.com");
    expect(populatedEmail.closest(".print\\:hidden")).toBeNull();
  });

  describe("Unified @media print pagination, backgroundless contrast, and mobile column preservation across all 17 templates", () => {
    it("removes injected @page style blocks across all 17 templates and clones padding on ModernTemplate + 7 sibling single-div templates", () => {
      expect(templateRegistry).toHaveLength(17);

      for (const entry of templateRegistry) {
        const TemplateComp = entry.component;
        const { container, unmount } = render(
          <TemplateComp
            resume={{ ...fullSampleResume, templateId: entry.id }}
            readOnly
          />
        );
        const injectedStyles = Array.from(container.querySelectorAll("style"));
        for (const styleTag of injectedStyles) {
          expect(styleTag.textContent || "").not.toContain("@page");
        }
        unmount();
      }

      const paddedTemplates = [
        ModernTemplate,
        ProfessionalTemplate,
        MinimalTemplate,
        TechSplitTemplate,
        ExecutiveTwoColumnTemplate,
        ClassicTemplate,
        ExecutiveTemplate,
        CompactTemplate,
      ];

      for (const PaddedComp of paddedTemplates) {
        const { container, unmount } = render(
          <PaddedComp resume={fullSampleResume} readOnly />
        );
        const rootDiv = container.firstElementChild as HTMLElement;
        expect(rootDiv).not.toBeNull();
        expect(rootDiv.style.boxDecorationBreak).toBe("clone");
        unmount();
      }
    });

    it("provides backgroundless high-contrast print fallbacks on BoldHeader, AccentSidebar, and Startup templates", () => {
      const { unmount: unmountBold } = render(
        <BoldHeaderTemplate resume={fullSampleResume} readOnly />
      );
      const boldBand = screen.getByTestId("bold-header-band");
      expect(boldBand.className).toContain("print:!bg-white");
      expect(boldBand.className).toContain("print:!text-slate-900");
      expect(screen.getByText("Maya Lin").className).toContain(
        "print:!text-slate-900"
      );
      unmountBold();

      const { unmount: unmountAccent } = render(
        <AccentSidebarTemplate resume={fullSampleResume} readOnly />
      );
      const accentAside = screen.getByTestId("accent-sidebar-aside");
      expect(accentAside.className).toContain("print:!bg-transparent");
      expect(accentAside.className).toContain("print:!text-slate-800");
      expect(
        screen.getByTestId("accent-sidebar-monogram").className
      ).toContain("print:!text-slate-900");
      unmountAccent();

      const { unmount: unmountStartup } = render(
        <StartupTemplate resume={fullSampleResume} readOnly />
      );
      const startupHeader = screen.getByTestId("startup-two-tone-header");
      expect(startupHeader.firstElementChild?.className).toContain(
        "print:!bg-white"
      );
      expect(screen.getByText("Maya Lin").className).toContain(
        "print:!text-slate-900"
      );
      unmountStartup();
    });

    it("preserves multi-column grids in print across ExecutiveTwoColumn, CreativeSidebar, Timeline, and Academic templates", () => {
      const { container: execContainer, unmount: unmountExec } = render(
        <ExecutiveTwoColumnTemplate resume={fullSampleResume} readOnly />
      );
      expect(
        execContainer.querySelector(".print\\:grid-cols-12")
      ).not.toBeNull();
      expect(
        execContainer.querySelector(".print\\:col-span-7")
      ).not.toBeNull();
      expect(
        execContainer.querySelector(".print\\:col-span-5")
      ).not.toBeNull();
      unmountExec();

      const { container: creativeContainer, unmount: unmountCreative } = render(
        <CreativeSidebarTemplate resume={fullSampleResume} readOnly />
      );
      const creativeRoot = creativeContainer.firstElementChild as HTMLElement;
      expect(creativeRoot.className).toContain("print:flex-row");
      const creativeAside = creativeContainer.querySelector("aside") as HTMLElement;
      expect(creativeAside.className).toContain("print:border-r");
      expect(creativeAside.className).toContain("print:border-b-0");
      unmountCreative();

      const { container: timelineContainer, unmount: unmountTimeline } = render(
        <TimelineTemplate resume={fullSampleResume} readOnly />
      );
      const timelineItem = timelineContainer.querySelector(
        '[data-timeline-item="true"]'
      ) as HTMLElement;
      expect(timelineItem.className).toContain(
        "print:grid-cols-[7.75rem_1.75rem_minmax(0,1fr)]"
      );
      unmountTimeline();

      const { unmount: unmountAcademic } = render(
        <AcademicTemplate resume={fullSampleResume} readOnly />
      );
      expect(
        screen.getByTestId("academic-references-grid").className
      ).toContain("print:grid-cols-2");
      unmountAcademic();
    });
  });
});
