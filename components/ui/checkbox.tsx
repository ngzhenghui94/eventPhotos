"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <label className="relative inline-block align-middle">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary appearance-none",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "checked:bg-primary checked:text-primary-foreground",
          className
        )}
        {...props}
      />
      <Check className="pointer-events-none absolute left-0 top-0 h-4 w-4 text-primary-foreground opacity-0 peer-checked:opacity-100" />
    </label>
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };