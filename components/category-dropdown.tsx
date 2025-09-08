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
          <Button type="button" variant="outline" className="w-full mt-2 border rounded px-2 py-1 text-left flex justify-between items-center">
            {category}
            <span className="ml-2 text-gray-400">▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[180px]">
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
