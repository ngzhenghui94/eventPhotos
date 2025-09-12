// Shadcn Calendar component (copied from shadcn/ui docs)
import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

export interface CalendarProps {
  className?: string
  value?: Date
  onChange?: (date: Date | undefined) => void
}

export function Calendar({ className, value, onChange }: CalendarProps) {
  const [selected, setSelected] = React.useState<Date | undefined>(value)

  React.useEffect(() => {
    setSelected(value)
  }, [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between rounded border px-3 py-2 text-left text-sm bg-white",
            className
          )}
        >
          {selected ? format(selected, "dd/MM/yyyy HH:mm") : <span className="text-gray-400">Pick date & time</span>}
          <CalendarIcon className="ml-2 h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(date) => {
            setSelected(date)
            onChange?.(date)
          }}
          showOutsideDays
          className="p-2"
        />
      </PopoverContent>
    </Popover>
  )
}
