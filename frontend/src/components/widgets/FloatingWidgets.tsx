import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronUp, Clock3, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  RelativeTime,
  RelativeTimeZone,
  RelativeTimeZoneDate,
  RelativeTimeZoneDisplay,
  RelativeTimeZoneLabel,
} from "@/components/kibo-ui/relative-time";
import { cn } from "@/lib/utils";

const BASE_CURRENCY = "INR";
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const TARGET_CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "GBP", label: "British Pound" },
  { code: "EUR", label: "Euro" },
  { code: "AED", label: "UAE Dirham" },
  { code: "JPY", label: "Japanese Yen" },
] as const;

const TIME_ZONES = [
  { label: "India", code: "IST", timeZone: "Asia/Kolkata" },
  { label: "UTC", code: "UTC", timeZone: "UTC" },
  { label: "London", code: "GMT", timeZone: "Europe/London" },
  { label: "New York", code: "ET", timeZone: "America/New_York" },
  { label: "Tokyo", code: "JST", timeZone: "Asia/Tokyo" },
] as const;

type ExchangeRateApiResponse = {
  result?: string;
  rates?: Record<string, number>;
  time_last_update_unix?: number;
};

type CurrencySnapshot = {
  rates: Partial<Record<(typeof TARGET_CURRENCIES)[number]["code"], number>>;
  updatedAt: Date | null;
};

type TargetCurrencyCode = (typeof TARGET_CURRENCIES)[number]["code"];

type BilateralAmountEntry = {
  foreignAmount: string;
  inrAmount: string;
  lastEdited: "foreign" | "inr";
};

type BilateralAmounts = Record<TargetCurrencyCode, BilateralAmountEntry>;

const DECIMAL_INPUT_REGEX = /^\d*\.?\d*$/;

function formatCurrencyRate(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseAmount(value: string) {
  if (value === "" || value === ".") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value: number, maxFractionDigits: number) {
  return value.toFixed(maxFractionDigits).replace(/\.?0+$/, "");
}

function createInitialBilateralAmounts(): BilateralAmounts {
  return TARGET_CURRENCIES.reduce((accumulator, currency) => {
    accumulator[currency.code] = {
      foreignAmount: "1",
      inrAmount: "",
      lastEdited: "foreign",
    };
    return accumulator;
  }, {} as BilateralAmounts);
}

function formatTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function FloatingWidgets() {
  const [now, setNow] = useState(() => new Date());
  const [snapshot, setSnapshot] = useState<CurrencySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrencyMinimized, setIsCurrencyMinimized] = useState(true);
  const [isClockMinimized, setIsClockMinimized] = useState(true);
  const [selectedCurrencyCode, setSelectedCurrencyCode] =
    useState<TargetCurrencyCode>("USD");
  const [currencyAmounts, setCurrencyAmounts] = useState<BilateralAmounts>(
    () => createInitialBilateralAmounts(),
  );

  const fetchRates = useCallback(async (initialLoad: boolean) => {
    if (initialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setError(null);
      const response = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
      if (!response.ok) {
        throw new Error(`Exchange rate request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ExchangeRateApiResponse;
      if (data.result !== "success" || !data.rates) {
        throw new Error("Exchange rate API returned an invalid payload");
      }

      const nextRates: CurrencySnapshot["rates"] = {};
      for (const currency of TARGET_CURRENCIES) {
        const rate = data.rates[currency.code];
        if (typeof rate === "number") {
          nextRates[currency.code] = rate;
        }
      }

      setSnapshot({
        rates: nextRates,
        updatedAt:
          typeof data.time_last_update_unix === "number"
            ? new Date(data.time_last_update_unix * 1000)
            : new Date(),
      });
    } catch (err) {
      console.error(err);
      setError("Could not load live conversion rates.");
    } finally {
      if (initialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchRates(true);
    const refreshTimer = window.setInterval(() => {
      void fetchRates(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [fetchRates]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(clockTimer);
    };
  }, []);

  const updatedAtLabel = useMemo(() => {
    if (!snapshot?.updatedAt) {
      return "--";
    }

    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      month: "short",
      day: "2-digit",
    }).format(snapshot.updatedAt);
  }, [snapshot?.updatedAt]);

  useEffect(() => {
    if (!snapshot?.rates) {
      return;
    }

    setCurrencyAmounts((currentAmounts) => {
      let hasChange = false;
      const nextAmounts: BilateralAmounts = { ...currentAmounts };

      for (const currency of TARGET_CURRENCIES) {
        const ratePerInr = snapshot.rates[currency.code];
        const current = currentAmounts[currency.code];
        if (typeof ratePerInr !== "number" || ratePerInr <= 0) {
          continue;
        }

        if (current.lastEdited === "foreign") {
          const parsedForeignAmount = parseAmount(current.foreignAmount);
          const nextInrAmount =
            parsedForeignAmount === null ? "" : formatAmount(parsedForeignAmount / ratePerInr, 2);

          if (nextInrAmount !== current.inrAmount) {
            nextAmounts[currency.code] = { ...current, inrAmount: nextInrAmount };
            hasChange = true;
          }
          continue;
        }

        const parsedInrAmount = parseAmount(current.inrAmount);
        const nextForeignAmount =
          parsedInrAmount === null ? "" : formatAmount(parsedInrAmount * ratePerInr, 4);

        if (nextForeignAmount !== current.foreignAmount) {
          nextAmounts[currency.code] = { ...current, foreignAmount: nextForeignAmount };
          hasChange = true;
        }
      }

      return hasChange ? nextAmounts : currentAmounts;
    });
  }, [snapshot?.rates]);

  const handleForeignAmountChange = useCallback(
    (currencyCode: TargetCurrencyCode, nextValue: string) => {
      if (!DECIMAL_INPUT_REGEX.test(nextValue)) {
        return;
      }

      setCurrencyAmounts((currentAmounts) => {
        const current = currentAmounts[currencyCode];
        const nextAmounts: BilateralAmounts = { ...currentAmounts };
        const ratePerInr = snapshot?.rates[currencyCode];
        const parsedForeignAmount = parseAmount(nextValue);
        const nextInrAmount =
          typeof ratePerInr === "number" && ratePerInr > 0 && parsedForeignAmount !== null
            ? formatAmount(parsedForeignAmount / ratePerInr, 2)
            : parsedForeignAmount === null
              ? ""
              : current.inrAmount;

        nextAmounts[currencyCode] = {
          foreignAmount: nextValue,
          inrAmount: nextInrAmount,
          lastEdited: "foreign",
        };

        return nextAmounts;
      });
    },
    [snapshot?.rates],
  );

  const handleInrAmountChange = useCallback(
    (currencyCode: TargetCurrencyCode, nextValue: string) => {
      if (!DECIMAL_INPUT_REGEX.test(nextValue)) {
        return;
      }

      setCurrencyAmounts((currentAmounts) => {
        const current = currentAmounts[currencyCode];
        const nextAmounts: BilateralAmounts = { ...currentAmounts };
        const ratePerInr = snapshot?.rates[currencyCode];
        const parsedInrAmount = parseAmount(nextValue);
        const nextForeignAmount =
          typeof ratePerInr === "number" && ratePerInr > 0 && parsedInrAmount !== null
            ? formatAmount(parsedInrAmount * ratePerInr, 4)
            : parsedInrAmount === null
              ? ""
              : current.foreignAmount;

        nextAmounts[currencyCode] = {
          foreignAmount: nextForeignAmount,
          inrAmount: nextValue,
          lastEdited: "inr",
        };

        return nextAmounts;
      });
    },
    [snapshot?.rates],
  );

  const selectedCurrency =
    TARGET_CURRENCIES.find((currency) => currency.code === selectedCurrencyCode) ??
    TARGET_CURRENCIES[0];
  const selectedEntry = currencyAmounts[selectedCurrency.code];
  const selectedRatePerInr = snapshot?.rates[selectedCurrency.code];
  const selectedInrEquivalent =
    typeof selectedRatePerInr === "number" && selectedRatePerInr > 0
      ? 1 / selectedRatePerInr
      : null;

  const istTimeLabel = useMemo(() => {
    return formatTimeInZone(now, "Asia/Kolkata");
  }, [now]);

  return (
    <motion.aside
      layout
      className="pointer-events-none fixed right-4 top-4 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col items-end gap-3"
    >
      <AnimatePresence initial={false} mode="wait">
        {isCurrencyMinimized ? (
          <motion.div
            key="currency-pill"
            layout
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto inline-flex max-w-full items-center gap-3 rounded-full border border-cyan-600/25 bg-gradient-to-r from-card via-card to-cyan-100/60 px-3 py-2 shadow-lg shadow-cyan-900/10 backdrop-blur-sm"
          >
            <p className="truncate text-xs">
              <span className="font-semibold">FX:</span>{" "}
              <span className="font-mono">
                {selectedEntry.foreignAmount || "0"} {selectedCurrency.code} ={" "}
                {selectedEntry.inrAmount || "--"} INR
              </span>
            </p>
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/70 hover:bg-secondary/60"
              onClick={() => setIsCurrencyMinimized(false)}
              aria-label="Expand currency widget"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="currency-card"
            layout
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full"
          >
            <Card className="pointer-events-auto w-full border-cyan-700/20 bg-gradient-to-br from-card via-card to-cyan-100/50 shadow-lg shadow-cyan-900/10">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">INR Conversion</CardTitle>
                    <p className="text-xs text-muted-foreground">Live rates as INR equivalent</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background/60 hover:bg-secondary/60"
                    onClick={() => setIsCurrencyMinimized(true)}
                    aria-label="Minimize currency widget"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-lg border border-cyan-700/20 bg-background/60 p-2.5">
                  <div className="space-y-1">
                    <label
                      htmlFor="currency-select"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Currency
                    </label>
                    <select
                      id="currency-select"
                      value={selectedCurrency.code}
                      onChange={(event) =>
                        setSelectedCurrencyCode(event.target.value as TargetCurrencyCode)
                      }
                      className="h-9 w-full rounded-md border border-input bg-background/70 px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {TARGET_CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.label} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <div className="space-y-1">
                      <label
                        htmlFor={`${selectedCurrency.code.toLowerCase()}-input`}
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        {selectedCurrency.code}
                      </label>
                      <Input
                        id={`${selectedCurrency.code.toLowerCase()}-input`}
                        inputMode="decimal"
                        value={selectedEntry.foreignAmount}
                        onChange={(event) =>
                          handleForeignAmountChange(selectedCurrency.code, event.target.value)
                        }
                        placeholder="1"
                        className="h-9 bg-background/70 font-mono"
                        disabled={selectedInrEquivalent === null}
                      />
                    </div>
                    <div className="flex h-9 items-center justify-center">
                      <ArrowRightLeft
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`${selectedCurrency.code.toLowerCase()}-inr-input`}
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        INR
                      </label>
                      <Input
                        id={`${selectedCurrency.code.toLowerCase()}-inr-input`}
                        inputMode="decimal"
                        value={selectedEntry.inrAmount}
                        onChange={(event) =>
                          handleInrAmountChange(selectedCurrency.code, event.target.value)
                        }
                        placeholder="0"
                        className="h-9 bg-background/70 font-mono"
                        disabled={selectedInrEquivalent === null}
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Live Rate: 1 {selectedCurrency.code} ={" "}
                    {selectedInrEquivalent !== null
                      ? formatCurrencyRate(selectedInrEquivalent)
                      : "--"}{" "}
                    INR
                  </p>
                </div>

                {isLoading && !snapshot ? (
                  <p className="text-sm text-muted-foreground">Loading exchange rates...</p>
                ) : null}

                {!isLoading && error && !snapshot ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-muted-foreground">Updated: {updatedAtLabel}</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 py-1 text-[11px] font-medium hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void fetchRates(false)}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("h-3 w-3", isRefreshing ? "animate-spin" : "")} />
                    Refresh
                  </motion.button>
                </div>

                {error && snapshot ? <p className="text-[11px] text-destructive">{error}</p> : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {isClockMinimized ? (
          <motion.div
            key="clock-pill"
            layout
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto inline-flex max-w-full items-center gap-3 rounded-full border border-orange-600/25 bg-gradient-to-r from-card via-card to-orange-100/65 px-3 py-2 shadow-lg shadow-orange-900/10 backdrop-blur-sm"
          >
            <p className="truncate text-xs">
              <span className="font-semibold">Clock:</span>{" "}
              <span className="font-mono">IST {istTimeLabel}</span>
            </p>
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/70 hover:bg-secondary/60"
              onClick={() => setIsClockMinimized(false)}
              aria-label="Expand world clock widget"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="clock-card"
            layout
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full"
          >
            <Card className="pointer-events-auto w-full border-orange-700/20 bg-gradient-to-br from-card via-card to-orange-100/55 shadow-lg shadow-orange-900/10">
              <CardHeader className="space-y-0 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base">World Clock</CardTitle>
                    <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background/60 hover:bg-secondary/60"
                    onClick={() => setIsClockMinimized(true)}
                    aria-label="Minimize world clock widget"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <RelativeTime
                  time={now}
                  className="space-y-1.5"
                  dateFormatOptions={{ month: "short", day: "2-digit" }}
                  timeFormatOptions={{
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  }}
                >
                  {TIME_ZONES.map((zone) => (
                    <RelativeTimeZone
                      key={zone.timeZone}
                      zone={zone.timeZone}
                      className="rounded-md border border-border/50 bg-background/60 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{zone.label}</p>
                        <RelativeTimeZoneLabel className="h-5 rounded-sm border border-orange-600/20 bg-orange-100/70 px-1.5 text-[10px] text-orange-900">
                          {zone.code}
                        </RelativeTimeZoneLabel>
                      </div>
                      <div className="text-right">
                        <RelativeTimeZoneDisplay className="pl-0 font-mono text-sm text-foreground" />
                        <RelativeTimeZoneDate className="text-[11px] text-muted-foreground" />
                      </div>
                    </RelativeTimeZone>
                  ))}
                </RelativeTime>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
