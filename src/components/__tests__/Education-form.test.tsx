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
        field: "Massachusetts Institute of Technology",
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
        field: "UC Berkeley",
        startDate: { month: "Aug", year: "2021" },
        endDate: { month: "May", year: "2025" },
      })
    );
  });
});
