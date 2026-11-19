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

describe("Print-to-PDF & Backend ATS Plain-Text (.txt) Export Flow", () => {
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

  it('triggers window.print on the A4 preview when clicking "Download PDF" and downloads .txt when clicking "Download ATS text"', async () => {
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
    const txtBtn = screen.getByTestId("export-txt-btn");
    const previewPage = screen.getByTestId("resume-preview-page");

    expect(pdfBtn).toHaveTextContent("Download PDF");
    expect(txtBtn).toHaveTextContent("Download ATS text");
    expect(previewPage.className).toContain("print:!transform-none");

    // Download PDF uses window.print on the preview
    fireEvent.click(pdfBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(exportTxtSpy).not.toHaveBeenCalled();

    // Download ATS text calls backend .txt endpoint and saves the file
    fireEvent.click(txtBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);
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

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(toastSuccessSpy).toHaveBeenCalledWith("ATS plain text downloaded");
    expect(txtBtn).toHaveTextContent("Download ATS text");
    expect(txtBtn).not.toBeDisabled();
  });

  it('flushes unsaved edits in ResumeEditor before calling GET /api/resumes/:id/export.txt when clicking "Download ATS text"', async () => {
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

  it("persists a brand-new unsaved resume before downloading ATS text from the editor overflow menu", async () => {
    const createSpy = jest
      .spyOn(resumeService, "createResume")
      .mockResolvedValueOnce({
        data: { _id: "newly-created-id-99" },
      } as any);
    const exportTxtSpy = jest
      .spyOn(resumeService, "exportResumeTxt")
      .mockResolvedValueOnce({
        blob: new Blob(["Untitled Resume\n"], {
          type: "text/plain;charset=utf-8",
        }),
        filename: "untitled-resume.txt",
      });

    render(<ResumeEditor onBack={jest.fn()} />);

    fireEvent.click(screen.getByTestId("toolbar-overflow-btn"));
    fireEvent.click(screen.getByTestId("export-txt-menu-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(exportTxtSpy).toHaveBeenCalledWith(
        "newly-created-id-99",
        "Untitled Resume"
      );
    });

    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("displays an error toast and resets loading state when backend .txt export fails", async () => {
    jest
      .spyOn(resumeService, "exportResumeTxt")
      .mockRejectedValueOnce(new Error("Failed to generate ATS text"));

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    const txtBtn = screen.getByTestId("export-txt-btn");
    fireEvent.click(txtBtn);

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith("Failed to generate ATS text");
    });

    expect(txtBtn).not.toBeDisabled();
    expect(txtBtn).toHaveTextContent("Download ATS text");
  });

  it("requests GET /api/resumes/:id/export.txt and extracts Content-Disposition filenames & Blob JSON errors", async () => {
    const getSpy = jest.spyOn(axiosInstance, "get").mockResolvedValueOnce({
      data: new Blob(["Anumula Ashok\n"], { type: "text/plain;charset=utf-8" }),
      headers: {
        "content-disposition": 'attachment; filename="staff-engineer.txt"',
      },
    } as any);

    const exported = await resumeService.exportResumeTxt(
      "507f1f77bcf86cd799439022",
      "Fallback Title"
    );
    expect(getSpy).toHaveBeenCalledWith(
      "/api/resumes/507f1f77bcf86cd799439022/export.txt",
      { responseType: "blob" }
    );
    expect(exported.filename).toBe("staff-engineer.txt");

    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''ashok%20resume.txt",
        "fallback.txt"
      )
    ).toBe("ashok resume.txt");
    expect(buildFallbackExportFilename("Staff C++ / Go Resume!")).toBe(
      "staff-c-go-resume.txt"
    );
    expect((resumeService as any).exportResumePdf).toBeUndefined();

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
      axiosInstance.get("/api/resumes/bad-id/export.txt", {
        responseType: "blob",
        adapter: failWithBlob,
      })
    ).rejects.toThrow("Resume not found");
  });
});
