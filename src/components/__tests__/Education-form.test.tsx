import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import EducationForm from "../Education-form";
import { dateFields, EducationItem } from "../../types/resume";

describe("EducationForm completion date handlers", () => {
  const buildEducationItem = (
    overrides?: Partial<EducationItem>
  ): EducationItem => ({
    id: "edu-1",
    degree: "B.S. in Computer Science",
    field: "Massachusetts Institute of Technology",
    location: "Cambridge, MA",
    current: false,
    startDate: { month: "Sep", year: "2018" },
    endDate: { month: "May", year: "2022" },
    description: "Honors graduate",
    ...overrides,
  });

  it("retains distinct startDate values and endDate.year when updating end month", () => {
    const onSave = jest.fn();
    render(
      <EducationForm
        initialContent={buildEducationItem()}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    const endSection = screen.getByText("End Date").parentElement!;
    fireEvent.click(within(endSection).getByRole("button", { name: "May" }));
    fireEvent.click(within(endSection).getByRole("button", { name: "June" }));

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "edu-1",
        degree: "B.S. in Computer Science",
        institution: "Massachusetts Institute of Technology",
        field: "",
        location: "Cambridge, MA",
        description: "Honors graduate",
        startDate: { month: "Sep", year: "2018" },
        endDate: { month: "Jun", year: "2022" },
      })
    );
  });

  it("retains distinct startDate values and endDate.month when updating end year", () => {
    const onSave = jest.fn();
    render(
      <EducationForm
        initialContent={buildEducationItem()}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    const endSection = screen.getByText("End Date").parentElement!;
    fireEvent.click(within(endSection).getByRole("button", { name: "2022" }));
    fireEvent.click(within(endSection).getByRole("button", { name: "2023" }));

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: { month: "Sep", year: "2018" },
        endDate: { month: "May", year: "2023" },
      })
    );
  });

  it("falls back to an empty date object when initialContent omits endDate and updates month/year cleanly", () => {
    const onSave = jest.fn();
    const itemWithoutEndDate: EducationItem = {
      id: "edu-no-end",
      degree: "M.S. in Data Science",
      field: "Stanford University",
      startDate: { month: "Sep", year: "2021" },
    };

    render(
      <EducationForm
        initialContent={itemWithoutEndDate}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    const endSection = screen.getByText("End Date").parentElement!;

    // Selecting end month alone should not copy startDate.year ("2021") into endDate.year
    fireEvent.click(within(endSection).getByRole("button", { name: "Month" }));
    fireEvent.click(
      within(endSection).getByRole("button", { name: "December" })
    );

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: { month: "Sep", year: "2021" },
        endDate: { month: "Dec", year: "" },
      })
    );

    // Selecting end year afterwards completes endDate without affecting startDate
    fireEvent.click(within(endSection).getByRole("button", { name: "Year" }));
    fireEvent.click(within(endSection).getByRole("button", { name: "2024" }));

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: { month: "Sep", year: "2021" },
        endDate: { month: "Dec", year: "2024" },
      })
    );
  });

  it("normalizes empty {} or omitted date objects on save and preserves independent state across arbitrary edit orders", () => {
    const onSave = jest.fn();
    const newlyAddedItem: EducationItem = {
      id: "edu-empty-dates",
      degree: "B.Eng.",
      field: "UC Berkeley",
      startDate: {} as dateFields,
      endDate: {} as dateFields,
      current: false,
    };

    render(
      <EducationForm
        initialContent={newlyAddedItem}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    // Saving immediately produces valid { month, year } objects
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: { month: "", year: "" },
        endDate: { month: "", year: "" },
      })
    );

    const startSection = screen.getByText("Start Date").parentElement!;
    const endSection = screen.getByText("End Date").parentElement!;

    // Edit in interleaved order: end year -> start month -> end month -> start year
    fireEvent.click(within(endSection).getByRole("button", { name: "Year" }));
    fireEvent.click(within(endSection).getByRole("button", { name: "2025" }));

    fireEvent.click(
      within(startSection).getByRole("button", { name: "Month" })
    );
    fireEvent.click(
      within(startSection).getByRole("button", { name: "August" })
    );

    fireEvent.click(within(endSection).getByRole("button", { name: "Month" }));
    fireEvent.click(within(endSection).getByRole("button", { name: "May" }));

    fireEvent.click(within(startSection).getByRole("button", { name: "Year" }));
    fireEvent.click(within(startSection).getByRole("button", { name: "2021" }));

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        degree: "B.Eng.",
        institution: "UC Berkeley",
        field: "",
        startDate: { month: "Aug", year: "2021" },
        endDate: { month: "May", year: "2025" },
      })
    );
  });

  it("initializes institution in default state and saves degree, school, major, GPA, and URL independently", () => {
    const onSave = jest.fn();
    render(<EducationForm onSave={onSave} onCancel={jest.fn()} />);

    const degreeInput = screen.getByLabelText(/Degree \/ Qualification/i) as HTMLInputElement;
    const schoolInput = screen.getByLabelText(/School \/ Institution/i) as HTMLInputElement;
    const fieldInput = screen.getByLabelText(/Field of Study \/ Major/i) as HTMLInputElement;
    const scoreInput = screen.getByLabelText(/GPA \/ Score/i) as HTMLInputElement;
    const urlInput = screen.getByLabelText(/Institution Website/i) as HTMLInputElement;

    expect(schoolInput.id).toBe("edu-school");
    expect(schoolInput.value).toBe("");

    fireEvent.change(degreeInput, { target: { value: "Master of Science" } });
    fireEvent.change(schoolInput, { target: { value: "Carnegie Mellon University" } });
    fireEvent.change(fieldInput, { target: { value: "Distributed Systems" } });
    fireEvent.change(scoreInput, { target: { value: "3.95 / 4.0" } });
    fireEvent.change(urlInput, { target: { value: "https://www.cmu.edu" } });

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        degree: "Master of Science",
        institution: "Carnegie Mellon University",
        field: "Distributed Systems",
        score: "3.95 / 4.0",
        url: "https://www.cmu.edu",
      })
    );
  });

  it("hydrates legacy school names from content.field when institution is empty without overwriting populated major fields", () => {
    const onSave = jest.fn();
    const { unmount } = render(
      <EducationForm
        initialContent={{
          id: "edu-legacy",
          institution: "",
          degree: "B.S.",
          field: "Georgia Institute of Technology",
        }}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    expect((screen.getByLabelText(/School \/ Institution/i) as HTMLInputElement).value).toBe(
      "Georgia Institute of Technology"
    );
    expect((screen.getByLabelText(/Field of Study \/ Major/i) as HTMLInputElement).value).toBe(
      ""
    );
    unmount();

    render(
      <EducationForm
        initialContent={{
          id: "edu-imported",
          institution: "Stanford University",
          degree: "B.S.",
          field: "Computer Science",
          score: "3.9",
          url: "https://stanford.edu",
        }}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    expect((screen.getByLabelText(/School \/ Institution/i) as HTMLInputElement).value).toBe(
      "Stanford University"
    );
    expect((screen.getByLabelText(/Field of Study \/ Major/i) as HTMLInputElement).value).toBe(
      "Computer Science"
    );
    expect((screen.getByLabelText(/GPA \/ Score/i) as HTMLInputElement).value).toBe("3.9");
    expect((screen.getByLabelText(/Institution Website/i) as HTMLInputElement).value).toBe(
      "https://stanford.edu"
    );
  });
});
