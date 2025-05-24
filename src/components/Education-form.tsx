"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  LinkIcon,
} from "lucide-react";
import {  EducationItem } from "../types/resume";

export default function EducationForm({
  initialContent,
  onSave,
  onCancel,
}: {
  initialContent?: EducationItem;
  onSave: (content: any) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(
    initialContent ??
      ({
        id: Date.now().toString(),
        degree: "",
        field: "",
        location: "",
        current: false,
        startDate: { month: "", year: "" },
        endDate: { month: "", year: "" },
        description: "",
      } as EducationItem)
  );

  const handleSave = () => {
    onSave(content);
  };

  const handleChange = (field: keyof EducationItem | string, value: any) => {
    setContent((prevContent) => ({
      ...prevContent,
      [field]: value,
    }));
  };

  const MonthYearSelector = ({
    selectedMonth,
    selectedYear,
    onMonthChange,
    onYearChange,
  }: {
    selectedMonth?: string;
    selectedYear?: string;
    onMonthChange: (value: string) => void;
    onYearChange: (value: string) => void;
  }) => {
    const months = [
      { value: "Jan", label: "January" },
      { value: "Feb", label: "February" },
      { value: "Mar", label: "March" },
      { value: "Apr", label: "April" },
      { value: "May", label: "May" },
      { value: "Jun", label: "June" },
      { value: "Jul", label: "July" },
      { value: "Aug", label: "August" },
      { value: "Sep", label: "September" },
      { value: "Oct", label: "October" },
      { value: "Nov", label: "November" },
      { value: "Dec", label: "December" },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 40 }, (_, i) =>
      (currentYear - i).toString()
    );

    return (
      <div className="flex gap-2 mb-2">
        <Select value={selectedMonth} onChange={onMonthChange}>
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear} onChange={onYearChange}>
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-blue-800">
          Create Education
        </h1>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="font-medium text-blue-900">Degree</label>
          <Input
            placeholder="Enter Degree / Field Of Study"
            className="bg-blue-50 border border-blue-200 focus:border-blue-500"
            value={content.degree}
            onChange={(e) => handleChange("degree", e.target.value)}
          />
        </div>

        <div>
          <label className="font-medium text-blue-900">School</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter school / university"
              className="bg-blue-50 border border-blue-200 flex-1"
              value={content.field}
              onChange={(e) => handleChange("field", e.target.value)}
            />
            <Button variant="outline" className="border-blue-300 text-blue-600">
              <LinkIcon className="h-4 w-4 mr-1" />
              Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-medium text-blue-900">City</label>
            <Input
              placeholder="Enter City and Country"
              className="bg-blue-50 border border-blue-200"
              value={content.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-medium text-blue-900">Start Date</label>
            <MonthYearSelector
              selectedMonth={content.startDate?.month}
              selectedYear={content.startDate?.year}
              onMonthChange={(value) =>
                handleChange("startDate", {
                  ...content.startDate,
                  month: value,
                })
              }
              onYearChange={(value) =>
                handleChange("startDate", {
                  ...content.startDate,
                  year: value,
                })
              }
            />
          </div>
          <div>
            <label className="font-medium text-blue-900">End Date</label>
            <MonthYearSelector
              selectedMonth={content.endDate?.month}
              selectedYear={content.endDate?.year}
              onMonthChange={(value) =>
                handleChange("endDate", {
                  ...content.startDate,
                  month: value,
                })
              }
              onYearChange={(value) =>
                handleChange("endDate", {
                  ...content.startDate,
                  year: value,
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="font-medium text-blue-900">Description</label>
          <div className="bg-blue-50 rounded-md">
            <div className="flex items-center p-2 border-b border-blue-200 gap-1">
              {[
                Bold,
                Italic,
                Underline,
                AlignLeft,
                List,
                ListOrdered,
                LinkIcon,
              ].map((Icon, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:bg-blue-100"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            <textarea
              className="w-full p-4 bg-transparent outline-none resize-none"
              rows={3}
              placeholder="Add a description of your education content..."
              value={content.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button
          className="bg-blue-500 hover:bg-blue-600 text-white px-8"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
