import { useMemo, useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>/?`~|\\";
const AMBIGUOUS_CHARS = new Set(["0", "O", "o", "1", "I", "l", "|"]);
const DEFAULT_LENGTH = 20;
const MIN_LENGTH = 4;
const MAX_LENGTH = 64;

interface PasswordOptions {
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  requireEveryType: boolean;
  avoidRepeatingCharacters: boolean;
  excludeAmbiguousCharacters: boolean;
}

interface OptionControl {
  key: keyof PasswordOptions;
  id: string;
  label: string;
  ariaLabel: string;
}

const defaultOptions: PasswordOptions = {
  includeLowercase: true,
  includeUppercase: true,
  includeNumbers: true,
  includeSymbols: true,
  requireEveryType: true,
  avoidRepeatingCharacters: false,
  excludeAmbiguousCharacters: false,
};

const optionControls: OptionControl[] = [
  {
    key: "includeLowercase",
    id: "opt-lowercase",
    label: "Lowercase letters (a-z)",
    ariaLabel: "Include lowercase letters",
  },
  {
    key: "includeUppercase",
    id: "opt-uppercase",
    label: "Uppercase letters (A-Z)",
    ariaLabel: "Include uppercase letters",
  },
  {
    key: "includeNumbers",
    id: "opt-numbers",
    label: "Numbers (0-9)",
    ariaLabel: "Include numbers",
  },
  {
    key: "includeSymbols",
    id: "opt-symbols",
    label: "Symbols (!, #, $, ...)",
    ariaLabel: "Include symbols",
  },
  {
    key: "requireEveryType",
    id: "opt-require-types",
    label: "Require every selected type",
    ariaLabel: "Require every selected character type",
  },
  {
    key: "excludeAmbiguousCharacters",
    id: "opt-exclude-ambiguous",
    label: "Exclude ambiguous characters (O, 0, l, 1)",
    ariaLabel: "Exclude ambiguous characters",
  },
  {
    key: "avoidRepeatingCharacters",
    id: "opt-no-repeat",
    label: "Disallow repeated characters",
    ariaLabel: "Disallow repeated characters",
  },
];

const filterCharset = (charset: string, excludeAmbiguousCharacters: boolean) => {
  if (!excludeAmbiguousCharacters) return charset;
  return Array.from(charset)
    .filter((char) => !AMBIGUOUS_CHARS.has(char))
    .join("");
};

const getSelectedSets = (options: PasswordOptions) => {
  const sets: string[] = [];
  if (options.includeLowercase) {
    sets.push(filterCharset(LOWERCASE, options.excludeAmbiguousCharacters));
  }
  if (options.includeUppercase) {
    sets.push(filterCharset(UPPERCASE, options.excludeAmbiguousCharacters));
  }
  if (options.includeNumbers) {
    sets.push(filterCharset(NUMBERS, options.excludeAmbiguousCharacters));
  }
  if (options.includeSymbols) {
    sets.push(filterCharset(SYMBOLS, options.excludeAmbiguousCharacters));
  }
  return sets.filter((charset) => charset.length > 0);
};

const getSecureRandomIndex = (max: number) => {
  if (max <= 0) return 0;
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    return Math.floor(Math.random() * max);
  }

  const random = new Uint32Array(1);
  const maxUint32PlusOne = 0x100000000;
  const threshold = maxUint32PlusOne - (maxUint32PlusOne % max);

  do {
    crypto.getRandomValues(random);
  } while (random[0] >= threshold);

  return random[0] % max;
};

const shuffleChars = (chars: string[]) => {
  const clone = [...chars];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = getSecureRandomIndex(index + 1);
    [clone[index], clone[randomIndex]] = [clone[randomIndex], clone[index]];
  }
  return clone;
};

const buildPassword = (length: number, selectedSets: string[], options: PasswordOptions) => {
  if (selectedSets.length === 0) {
    return { password: "", error: "Select at least one character option." };
  }

  const allCharacters = Array.from(new Set(selectedSets.join("").split("")));
  if (allCharacters.length === 0) {
    return { password: "", error: "No valid characters available with current settings." };
  }

  if (options.requireEveryType && length < selectedSets.length) {
    return {
      password: "",
      error: `Length must be at least ${selectedSets.length} to include each selected character type.`,
    };
  }

  if (options.avoidRepeatingCharacters && length > allCharacters.length) {
    return {
      password: "",
      error: `Length must be ${allCharacters.length} or less when repetition is disabled.`,
    };
  }

  const passwordChars: string[] = [];
  const usedCharacters = new Set<string>();

  if (options.requireEveryType) {
    for (const charset of selectedSets) {
      const candidates = options.avoidRepeatingCharacters
        ? Array.from(charset).filter((char) => !usedCharacters.has(char))
        : Array.from(charset);

      if (candidates.length === 0) {
        return {
          password: "",
          error: "Unable to satisfy unique character requirements. Adjust options and retry.",
        };
      }

      const char = candidates[getSecureRandomIndex(candidates.length)];
      passwordChars.push(char);
      usedCharacters.add(char);
    }
  }

  while (passwordChars.length < length) {
    const candidates = options.avoidRepeatingCharacters
      ? allCharacters.filter((char) => !usedCharacters.has(char))
      : allCharacters;

    if (candidates.length === 0) {
      return { password: "", error: "No additional unique characters are available." };
    }

    const char = candidates[getSecureRandomIndex(candidates.length)];
    passwordChars.push(char);
    usedCharacters.add(char);
  }

  const password = shuffleChars(passwordChars).join("");
  return { password, error: null };
};

const formatEntropy = (entropy: number) => `${Math.round(entropy)} bits`;

const getStrength = (entropy: number) => {
  if (entropy >= 90) return { label: "Very strong", toneClass: "text-emerald-700" };
  if (entropy >= 70) return { label: "Strong", toneClass: "text-green-700" };
  if (entropy >= 50) return { label: "Moderate", toneClass: "text-amber-700" };
  return { label: "Weak", toneClass: "text-rose-700" };
};

export function PasswordGeneratorPage() {
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [options, setOptions] = useState<PasswordOptions>(defaultOptions);
  const initialResult = useMemo(
    () => buildPassword(DEFAULT_LENGTH, getSelectedSets(defaultOptions), defaultOptions),
    [],
  );
  const [password, setPassword] = useState(initialResult.password);
  const [error, setError] = useState<string | null>(initialResult.error);
  const [copied, setCopied] = useState(false);

  const selectedSets = useMemo(() => getSelectedSets(options), [options]);
  const characterPool = useMemo(
    () => Array.from(new Set(selectedSets.join("").split(""))),
    [selectedSets],
  );

  const entropy = useMemo(() => {
    if (characterPool.length === 0) return 0;
    if (options.avoidRepeatingCharacters) {
      let bits = 0;
      for (let index = 0; index < length; index += 1) {
        const available = characterPool.length - index;
        if (available <= 0) break;
        bits += Math.log2(available);
      }
      return bits;
    }
    return length * Math.log2(characterPool.length);
  }, [characterPool.length, length, options.avoidRepeatingCharacters]);

  const strength = getStrength(entropy);

  const generate = () => {
    const result = buildPassword(length, selectedSets, options);
    setPassword(result.password);
    setError(result.error);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setError("Copy failed. Please copy manually.");
    }
  };

  const updateOption = (key: keyof PasswordOptions, checked: boolean) => {
    setOptions((previous) => ({
      ...previous,
      [key]: checked,
    }));
  };

  return (
    <ToolPageLayout
      title="Password Generator"
      description="Generate strong passwords with length controls and customizable character rules."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Password settings
            </CardTitle>
            <CardDescription>
              Choose the character mix and complexity constraints before generating.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Character length</span>
                <span className="font-medium">{length}</span>
              </div>
              <input
                type="range"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                step={1}
                value={length}
                onChange={(event) => setLength(Number.parseInt(event.target.value, 10))}
                className="h-2 w-full cursor-pointer accent-primary"
                aria-label="Password length"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{MIN_LENGTH}</span>
                <span>{MAX_LENGTH}</span>
              </div>
            </div>

            <div className="grid gap-2">
              {optionControls.map((control) => (
                <div
                  key={control.id}
                  className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
                >
                  <label htmlFor={control.id}>{control.label}</label>
                  <Switch
                    id={control.id}
                    checked={options[control.key]}
                    onCheckedChange={(checked) => updateOption(control.key, checked)}
                    aria-label={control.ariaLabel}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated password</CardTitle>
            <CardDescription>Use Generate to create a fresh value with your selected rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={password}
              readOnly
              className="font-mono text-base"
              aria-label="Generated password"
            />
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>
                Character pool: <span className="font-medium text-foreground">{characterPool.length}</span>
              </p>
              <p>
                Estimated entropy:{" "}
                <span className="font-medium text-foreground">{formatEntropy(entropy)}</span>
              </p>
              <p>
                Strength: <span className={`font-semibold ${strength.toneClass}`}>{strength.label}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate
              </Button>
              <Button variant="secondary" onClick={copyToClipboard} disabled={!password}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
