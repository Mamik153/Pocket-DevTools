import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar rounded-md border border-input bg-background/50 p-3",
        "rtl:**:[.rdp-button_next>svg]:rotate-180 rtl:**:[.rdp-button_previous>svg]:rotate-180",
        className,
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex w-full flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("w-full flex flex-col gap-4", defaultClassNames.month),
        month_caption: cn("relative mx-10 flex h-8 items-center justify-center", defaultClassNames.month_caption),
        caption_label: cn("select-none text-sm font-medium", defaultClassNames.caption_label),
        dropdowns: cn("flex h-8 w-full items-center justify-center gap-2", defaultClassNames.dropdowns),
        dropdown_root: cn(
          "relative rounded-md border border-input bg-background shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        months_dropdown: cn("text-sm font-medium", defaultClassNames.months_dropdown),
        years_dropdown: cn("text-sm font-medium", defaultClassNames.years_dropdown),
        nav: cn("absolute inset-x-0 top-0 flex h-8 items-center justify-between", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-transparent p-0 text-muted-foreground hover:text-foreground",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-transparent p-0 text-muted-foreground hover:text-foreground",
          defaultClassNames.button_next,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn("w-8 text-xs font-medium text-muted-foreground", defaultClassNames.weekday),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        day: cn("relative h-8 w-8 p-0 text-center text-sm", defaultClassNames.day),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
          defaultClassNames.day_button,
        ),
        range_start: cn("bg-primary text-primary-foreground rounded-l-md", defaultClassNames.range_start),
        range_middle: cn("bg-primary/15 text-foreground rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-primary text-primary-foreground rounded-r-md", defaultClassNames.range_end),
        selected: cn("bg-primary text-primary-foreground", defaultClassNames.selected),
        today: cn("ring-1 ring-ring", defaultClassNames.today),
        outside: cn("text-muted-foreground opacity-50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) => {
          if (orientation === "left") {
            return <ChevronLeft className={cn("size-4", iconClassName)} {...iconProps} />;
          }

          if (orientation === "right") {
            return <ChevronRight className={cn("size-4", iconClassName)} {...iconProps} />;
          }

          return <ChevronDown className={cn("size-4", iconClassName)} {...iconProps} />;
        },
      }}
      {...props}
    />
  );
}
