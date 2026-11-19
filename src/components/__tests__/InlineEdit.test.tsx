import React, { useState } from "react";
import { render, screen, fireEvent, createEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { InlineEdit } from "../ui/InlineEdit";

const StatefulInlineEdit: React.FC<{
  initialValue: string;
  multiline?: boolean;
  placeholder?: string;
  onCommit?: (val: string) => void;
}> = ({ initialValue, multiline = false, placeholder, onCommit }) => {
  const [val, setVal] = useState(initialValue);
  return (
    <InlineEdit
      value={val}
      multiline={multiline}
      placeholder={placeholder}
      onChange={(next) => {
        setVal(next);
        onCommit?.(next);
      }}
    />
  );
};

describe("InlineEdit keyboard accessibility and focus management", () => {
  it("renders preview container with role='button', tabIndex={0}, aria-label, and visible focus ring styles without stealing initial focus", () => {
    const handleChange = jest.fn();
    render(
      <InlineEdit
        value="Staff Frontend Engineer"
        onChange={handleChange}
        placeholder="Click to set title"
      />
    );

    const preview = screen.getByRole("button", {
      name: /Inline edit: Staff Frontend Engineer/i,
    });
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute("tabindex", "0");
    expect(preview).toHaveClass("focus-ring", "focus:ring-2", "focus-visible:ring-2");
    expect(preview).not.toHaveFocus();
  });

  it("uses placeholder in aria-label when value is empty and supports custom ariaLabel", () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <InlineEdit value="" onChange={handleChange} placeholder="Add summary" />
    );

    expect(
      screen.getByRole("button", { name: "Inline edit: Add summary" })
    ).toHaveTextContent("Add summary");

    rerender(
      <InlineEdit
        value="Jordan Lee"
        onChange={handleChange}
        ariaLabel="Candidate full name"
      />
    );

    expect(
      screen.getByRole("button", { name: "Candidate full name" })
    ).toHaveTextContent("Jordan Lee");
  });

  it("supports sequential Tab and Shift+Tab focus navigation across multiple InlineEdit fields", () => {
    render(
      <div>
        <InlineEdit value="Jordan Lee" onChange={jest.fn()} />
        <InlineEdit value="Principal Engineer" onChange={jest.fn()} />
        <InlineEdit value="San Francisco, CA" onChange={jest.fn()} />
      </div>
    );

    const first = screen.getByRole("button", { name: /Jordan Lee/i });
    const second = screen.getByRole("button", { name: /Principal Engineer/i });
    const third = screen.getByRole("button", { name: /San Francisco, CA/i });

    userEvent.tab();
    expect(first).toHaveFocus();

    userEvent.tab();
    expect(second).toHaveFocus();

    userEvent.tab();
    expect(third).toHaveFocus();

    userEvent.tab({ shift: true });
    expect(second).toHaveFocus();
  });

  it("activates edit mode on Enter keypress, focuses the input, saves on Enter, and restores focus to the preview container", () => {
    const onCommit = jest.fn();
    render(<StatefulInlineEdit initialValue="Jordan Lee" onCommit={onCommit} />);

    const preview = screen.getByRole("button", { name: /Jordan Lee/i });
    userEvent.tab();
    expect(preview).toHaveFocus();

    fireEvent.keyDown(preview, { key: "Enter", code: "Enter" });

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.value).toBe("Jordan Lee");

    fireEvent.change(input, { target: { value: "Jordan M. Lee" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("Jordan M. Lee");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    const updatedPreview = screen.getByRole("button", { name: /Jordan M\. Lee/i });
    expect(updatedPreview).toHaveTextContent("Jordan M. Lee");
    expect(updatedPreview).toHaveFocus();
  });

  it("activates edit mode on Space keypress and calls preventDefault to prevent page scrolling", () => {
    const handleChange = jest.fn();
    render(<InlineEdit value="Acme Corp" onChange={handleChange} />);

    const preview = screen.getByRole("button", { name: /Acme Corp/i });
    preview.focus();
    expect(preview).toHaveFocus();

    const spaceEvent = createEvent.keyDown(preview, { key: " ", code: "Space" });
    fireEvent(preview, spaceEvent);

    expect(spaceEvent.defaultPrevented).toBe(true);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.value).toBe("Acme Corp");
  });

  it("cancels editing on Escape without calling onChange, reverts value, and restores focus to the preview container", () => {
    const onCommit = jest.fn();
    render(<StatefulInlineEdit initialValue="Original Role" onCommit={onCommit} />);

    const preview = screen.getByRole("button", { name: /Original Role/i });
    preview.focus();
    fireEvent.keyDown(preview, { key: "Enter" });

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "Discarded Draft" } });
    expect(input.value).toBe("Discarded Draft");

    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    const restoredPreview = screen.getByRole("button", { name: /Original Role/i });
    expect(restoredPreview).toHaveTextContent("Original Role");
    expect(restoredPreview).toHaveFocus();
  });

  it("saves updated value on blur and restores focus when focus is not moving to another interactive element", () => {
    const onCommit = jest.fn();
    render(<StatefulInlineEdit initialValue="Initial Bio" onCommit={onCommit} />);

    const preview = screen.getByRole("button", { name: /Initial Bio/i });
    preview.focus();
    fireEvent.keyDown(preview, { key: " " });

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "Updated Bio" } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("Updated Bio");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    const updatedPreview = screen.getByRole("button", { name: /Updated Bio/i });
    expect(updatedPreview).toHaveFocus();
  });

  it("does not call onChange on blur when the value has not changed", () => {
    const handleChange = jest.fn();
    render(<InlineEdit value="Unchanged Text" onChange={handleChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Unchanged Text/i }));
    const input = screen.getByRole("textbox");
    fireEvent.blur(input);

    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Unchanged Text/i })).toHaveFocus();
  });

  it("preserves focus on the next interactive element when Tabbing out of an active inline input", () => {
    const onCommit = jest.fn();
    render(
      <div>
        <StatefulInlineEdit initialValue="First Field" onCommit={onCommit} />
        <InlineEdit value="Second Field" onChange={jest.fn()} />
      </div>
    );

    const firstPreview = screen.getByRole("button", { name: /First Field/i });
    const secondPreview = screen.getByRole("button", { name: /Second Field/i });

    firstPreview.focus();
    fireEvent.keyDown(firstPreview, { key: "Enter" });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "First Field Edited" } });

    userEvent.tab();

    expect(onCommit).toHaveBeenCalledWith("First Field Edited");
    expect(secondPreview).toHaveFocus();
  });

  it("supports multiline textarea where Enter does not close edit mode, Escape cancels, and blur saves", () => {
    const onCommit = jest.fn();
    render(
      <StatefulInlineEdit
        initialValue="Line 1"
        multiline
        onCommit={onCommit}
      />
    );

    const preview = screen.getByRole("button", { name: /Line 1/i });
    preview.focus();
    fireEvent.keyDown(preview, { key: "Enter" });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveFocus();

    // Pressing Enter in multiline mode keeps edit mode open
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();

    // Editing and blurring saves multiline content and restores focus
    fireEvent.change(textarea, { target: { value: "Line 1\nLine 2" } });
    fireEvent.blur(textarea);

    expect(onCommit).toHaveBeenCalledWith("Line 1\nLine 2");
    const updatedPreview = screen.getByRole("button", { name: /Line 1/i });
    expect(updatedPreview).toHaveFocus();
  });

  it("prevents keyboard and click activation when readOnly is true or onChange is undefined", () => {
    const handleChange = jest.fn();
    const { rerender, container } = render(
      <InlineEdit value="Read Only Name" onChange={handleChange} readOnly />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const staticText = screen.getByText("Read Only Name");
    expect(staticText).not.toHaveAttribute("tabindex");

    fireEvent.keyDown(staticText, { key: "Enter" });
    fireEvent.keyDown(staticText, { key: " " });
    fireEvent.click(staticText);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();

    // Without onChange handler
    rerender(<InlineEdit value="No Handler Text" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const noHandlerText = screen.getByText("No Handler Text");
    fireEvent.keyDown(noHandlerText, { key: "Enter" });
    fireEvent.keyDown(noHandlerText, { key: " " });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    // Empty value in readOnly mode renders nothing
    rerender(<InlineEdit value="" readOnly />);
    expect(container).toBeEmptyDOMElement();
  });
});
