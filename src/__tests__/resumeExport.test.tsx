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

describe("Frontend Server-Side PDF & ATS Plain Text Export Pipeline", () => {
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

  it("renders distinct PDF and ATS Text download buttons instead of browser Print and shows loading feedback", async () => {
    let resolvePdf!: (val: { blob: Blob; filename: string }) => void;
    const exportPdfSpy = jest
      .spyOn(resumeService, "exportResumePdf")
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePdf = resolve;
          })
      );

    render(<ResumePreview resume={sampleResume} />);

    const pdfBtn = screen.getByTestId("export-pdf-btn");
    const txtBtn = screen.getByTestId("export-txt-btn");

    expect(pdfBtn).toHaveTextContent("Download PDF");
    expect(txtBtn).toHaveTextContent("ATS Text");
    expect(screen.queryByRole("button", { name: /^print$/i })).not.toBeInTheDocument();

    fireEvent.click(pdfBtn);
    expect(printSpy).not.toHaveBeenCalled();
    expect(exportPdfSpy).toHaveBeenCalledWith("res-export-1", "Staff Backend Resume");

    // Loading feedback while server renders PDF
    expect(pdfBtn).toHaveTextContent("Exporting PDF…");
    expect(pdfBtn).toBeDisabled();
    expect(txtBtn).toBeDisabled();

    await act(async () => {
      resolvePdf({
        blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
        filename: "staff-backend-resume.pdf",
      });
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(toastSuccessSpy).toHaveBeenCalledWith("PDF resume downloaded");
    expect(pdfBtn).toHaveTextContent("Download PDF");
    expect(pdfBtn).not.toBeDisabled();
  });

  it("downloads ATS plain text via ResumeEditor and flushes unsaved edits before requesting server export", async () => {
    const updateSpy = jest
      .spyOn(resumeService, "updateResume")
      .mockResolvedValueOnce({ _id: "res-export-1" } as any);
    const exportTxtSpy = jest
      .spyOn(resumeService, "exportResumeTxt")
      .mockResolvedValueOnce({
        blob: new Blob(["Anumula Ashok\nWORK EXPERIENCE\n"], {
          type: "text/plain;charset=utf-8",
        }),
        filename: "staff-backend-resume.txt",
      });

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    // Make an unsaved edit right before clicking ATS Text export
    fireEvent.change(screen.getByLabelText("Professional Title"), {
      target: { value: "Principal Distributed Systems Engineer" },
    });

    fireEvent.click(screen.getByTestId("export-txt-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(exportTxtSpy).toHaveBeenCalledWith(
        "res-export-1",
        "Staff Backend Resume"
      );
    });

    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(toastSuccessSpy).toHaveBeenCalledWith("ATS plain text downloaded");
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("persists a brand-new unsaved resume before exporting PDF from the editor overflow menu", async () => {
    const createSpy = jest
      .spyOn(resumeService, "createResume")
      .mockResolvedValueOnce({
        data: { _id: "newly-created-id-99" },
      } as any);
    const exportPdfSpy = jest
      .spyOn(resumeService, "exportResumePdf")
      .mockResolvedValueOnce({
        blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
        filename: "untitled-resume.pdf",
      });

    render(<ResumeEditor onBack={jest.fn()} />);

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    fireEvent.click(screen.getByRole("menuitem", { name: /export/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(exportPdfSpy).toHaveBeenCalledWith(
        "newly-created-id-99",
        "Untitled Resume"
      );
    });

    expect(printSpy).not.toHaveBeenCalled();
  });

  it("displays an error toast and resets loading state when server export fails", async () => {
    jest
      .spyOn(resumeService, "exportResumePdf")
      .mockRejectedValueOnce(new Error("Document rendering timed out"));

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    const pdfBtn = screen.getByTestId("export-pdf-btn");
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith("Document rendering timed out");
    });

    expect(pdfBtn).not.toBeDisabled();
    expect(pdfBtn).toHaveTextContent("Download PDF");
  });

  it("parses Content-Disposition filenames and extracts JSON error messages from failed Blob responses", async () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="senior-engineer.pdf"',
        "fallback.pdf"
      )
    ).toBe("senior-engineer.pdf");
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''ashok%20resume.txt",
        "fallback.txt"
      )
    ).toBe("ashok resume.txt");
    expect(buildFallbackExportFilename("Staff C++ / Go Resume!", "pdf")).toBe(
      "staff-c-go-resume.pdf"
    );

    const errorBlob = {
      text: () =>
        Promise.resolve(JSON.stringify({ success: false, message: "Resume not found" })),
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
      axiosInstance.get("/api/resumes/bad-id/export/pdf", {
        responseType: "blob",
        adapter: failWithBlob,
      })
    ).rejects.toThrow("Resume not found");
  });
});
