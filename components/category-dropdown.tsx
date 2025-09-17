"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

const categories = [
  "General", "Wedding", "Birthday", "Party", "Travel", "Event", "Conference", "Reunion", "Festival", "Corporate", "Sports", "Holiday", "Other"
];

type CategoryDropdownProps = {
  initialCategory?: string;
  onChange?: (category: string) => void;
};

export function CategoryDropdown({ initialCategory, onChange }: CategoryDropdownProps) {
  const [category, setCategory] = React.useState(initialCategory || "General");

  React.useEffect(() => {
    if (onChange) onChange(category);
  }, [category, onChange]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="category">Category</Label>
      <input type="hidden" name="category" value={category} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-2 h-9 border-2 border-amber-200 rounded-lg text-left flex justify-between items-center bg-amber-50 hover:bg-amber-50 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
          >
            {category}
            <span className="ml-2 text-gray-400">▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[180px] bg-amber-50 border-amber-200">
          <DropdownMenuRadioGroup value={category} onValueChange={setCategory}>
            {categories.map((cat) => (
              <DropdownMenuRadioItem key={cat} value={cat} className="capitalize">
                {cat}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
