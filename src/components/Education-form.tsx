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
import { render } from "@testing-library/react";

export default function EducationForm() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-medium text-gray-800">Create Education</h1>
        <Button
          variant="ghost"
          className="text-gray-700 flex items-center gap-1.5"
        >
          <span className="text-red-500">📋</span> Need help?
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center mb-1">
            <label className="font-medium text-gray-800">Degree</label>
            <span className="text-gray-400 text-sm ml-2">optional</span>
          </div>
          <Input
            placeholder="Enter Degree / Field Of Study / Exchange Semester"
            className="bg-gray-100 border-0"
          />
        </div>

        <div>
          <div className="flex items-center mb-1">
            <label className="font-medium text-gray-800">School</label>
            <span className="text-gray-400 text-sm ml-2">optional</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter school / university"
              className="bg-gray-100 border-0 flex-1"
            />
            <Button
              variant="outline"
              className="flex items-center gap-1.5 border-gray-300"
            >
              <LinkIcon className="h-4 w-4" />
              Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center mb-1">
              <label className="font-medium text-gray-800">City</label>
              <span className="text-gray-400 text-sm ml-2">optional</span>
            </div>
            <Input placeholder="Enter City" className="bg-gray-100 border-0" />
          </div>
          <div>
            <div className="flex items-center mb-1">
              <label className="font-medium text-gray-800">Country</label>
              <span className="text-gray-400 text-sm ml-2">optional</span>
            </div>
            <Input
              placeholder="Enter Country"
              className="bg-gray-100 border-0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center mb-1">
              <label className="font-medium text-gray-800">Start Date</label>
              <span className="text-gray-400 text-sm ml-2">optional</span>
            </div>
            <div className="flex gap-2 mb-2">
              <Select>{MonthYearSelector()}</Select>
            </div>
          </div>

          <div>
            <div className="flex items-center mb-1">
              <label className="font-medium text-gray-800">End Date</label>
              <span className="text-gray-400 text-sm ml-2">optional</span>
            </div>
            <div className="flex gap-2 mb-2">
              <Select>{MonthYearSelector()}</Select>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center mb-1">
            <label className="font-medium text-gray-800">Description</label>
            <span className="text-gray-400 text-sm ml-2">optional</span>
          </div>
          <div className="border-0 bg-gray-100 rounded-md overflow-hidden">
            <div className="flex items-center p-2 border-b border-gray-200 gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                <Underline className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded bg-purple-600 text-white"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              className="w-full p-4 bg-transparent outline-none resize-none"
              rows={3}
              placeholder="Add a description of your education entry..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8 gap-2">
        <Button variant="outline" className="text-gray-700">
          Cancel
        </Button>
        <Button className="bg-pink-500 hover:bg-pink-600 text-white px-8">
          Save
        </Button>
      </div>
    </div>
  );
}

const MonthYearSelector = () => {
  const months = [
    { value: "jan", label: "January" },
    { value: "feb", label: "February" },
    { value: "mar", label: "March" },
    { value: "apr", label: "April" },
    { value: "may", label: "May" },
    { value: "jun", label: "June" },
    { value: "jul", label: "July" },
    { value: "aug", label: "August" },
    { value: "sep", label: "September" },
    { value: "oct", label: "October" },
    { value: "nov", label: "November" },
    { value: "dec", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i); // Last 10 years

  return (
    <div className="flex gap-2 mb-2">
      <Select>
        <SelectTrigger className="max-h-40 overflow-y-auto">
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

      <Select>
        <SelectTrigger className="max-h-40 overflow-y-auto">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
