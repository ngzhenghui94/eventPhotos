"use client";

import * as React from "react";
import { Root, Trigger, Content, Arrow } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'center' | 'start' | 'end';
  className?: string;
};

export function Tooltip({ children, content, side = "top", align = "center", className }: TooltipProps) {
  return (
    <Root delayDuration={200}>
      <Trigger asChild>{children}</Trigger>
      <Content
        side={side}
        align={align}
        className={cn(
          "z-50 rounded-md bg-black px-3 py-2 text-xs text-white shadow-md animate-in fade-in-0",
          className
        )}
        sideOffset={8}
      >
        {content}
        <Arrow className="fill-black" />
      </Content>
    </Root>
  );
}
