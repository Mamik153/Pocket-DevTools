import { useMemo, useState } from "react";
import { CalendarIcon, Clock3 } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const nowMs = Date.now();

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date) => {
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
};

export function TimestampConverterPage() {
  const initialDate = new Date(nowMs);
  const [epochInput, setEpochInput] = useState(nowMs.toString());
  const [timeInput, setTimeInput] = useState(toTimeInputValue(initialDate));
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateInput = useMemo(() => toDateInputValue(selectedDate), [selectedDate]);
  const dateLabel = useMemo(
    () => selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
    [selectedDate],
  );

  const humanReadable = useMemo(() => {
    const numericValue = Number(epochInput.trim());
    if (!Number.isFinite(numericValue)) {
      return "";
    }

    const assumedMilliseconds = numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
    const date = new Date(assumedMilliseconds);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toString();
  }, [epochInput]);

  const convertEpochToDate = () => {
    const numericValue = Number(epochInput.trim());
    if (!Number.isFinite(numericValue)) {
      setError("Epoch value must be numeric.");
      return;
    }

    const assumedMilliseconds = numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
    const date = new Date(assumedMilliseconds);
    if (Number.isNaN(date.getTime())) {
      setError("Epoch value is out of range.");
      return;
    }

    const localDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setTimeInput(toTimeInputValue(date));
    setSelectedDate(localDateOnly);
    setError(null);
  };

  const convertDateToEpoch = () => {
    const dateValue = toDateInputValue(selectedDate);
    const date = new Date(`${dateValue}T${timeInput}`);
    if (Number.isNaN(date.getTime())) {
      setError("Date value is invalid.");
      return;
    }

    setEpochInput(date.getTime().toString());
    setError(null);
  };

  return (
    <ToolPageLayout
      title="Timestamp Converter"
      description="Convert epoch timestamps and local date-time values in both directions."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" /> Epoch to Date
            </CardTitle>
            <CardDescription>Supports seconds or milliseconds input.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Epoch</span>
              <Input
                value={epochInput}
                onChange={(event) => setEpochInput(event.target.value)}
                className="font-mono"
                aria-label="Epoch input"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={convertEpochToDate}>To Date</Button>
            </div>
            {humanReadable ? (
              <p className="rounded-md border border-border/70 bg-secondary/20 p-2 font-mono text-xs">{humanReadable}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date to Epoch</CardTitle>
            <CardDescription>Use shadcn inputs for local date and time selection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Date</span>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                      aria-label="Open date picker"
                    >
                      <span>{dateLabel}</span>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(value) => {
                        if (!value) return;
                        setSelectedDate(value);
                        setIsDatePickerOpen(false);
                      }}
                      captionLayout="dropdown"
                      startMonth={new Date(1970, 0)}
                      endMonth={new Date(2100, 11)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Time</span>
                <Input
                  type="time"
                  step={1}
                  value={timeInput}
                  onChange={(event) => setTimeInput(event.target.value)}
                  className="font-mono"
                  aria-label="Time input"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Selected date</span>
                <Input value={dateInput} readOnly className="font-mono" aria-label="Selected date display" />
              </label>
            </div>
            <Button onClick={convertDateToEpoch}>To Epoch (ms)</Button>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
