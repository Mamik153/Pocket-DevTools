import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ICO_SIZES,
  MAX_SVG_RENDER_PX,
  type ConvertSettings,
  type ConvertTarget,
} from "@/lib/image";

interface ConvertOptionsProps {
  target: ConvertTarget;
  settings: ConvertSettings;
  /** Whether the current batch holds an SVG; the render-size control is moot otherwise. */
  hasSvg: boolean;
  onChange: (patch: Partial<ConvertSettings>) => void;
}

const numberOrNull = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function ConvertOptions({ target, settings, hasSvg, onChange }: ConvertOptionsProps) {
  const isLossy = target === "jpeg" || target === "webp";
  const isIcon = target === "ico";
  // JPEG has no alpha channel: transparent pixels would come out black, so the
  // backdrop is mandatory rather than optional here.
  const supportsTransparency = target !== "jpeg";

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:grid-cols-2">
      {isLossy && (
        <div className="space-y-1.5">
          <Label htmlFor="convert-quality">
            Quality{" "}
            <span className="text-muted-foreground tabular-nums">
              {Math.round(settings.quality * 100)}%
            </span>
          </Label>
          <input
            id="convert-quality"
            type="range"
            min={10}
            max={100}
            step={1}
            value={Math.round(settings.quality * 100)}
            onChange={(event) => onChange({ quality: Number(event.target.value) / 100 })}
            className="w-full accent-primary"
          />
        </div>
      )}

      {isIcon && (
        <fieldset className="space-y-1.5 sm:col-span-2">
          <legend className="text-sm font-medium">Sizes</legend>
          <div className="flex flex-wrap gap-3">
            {ICO_SIZES.map((size) => {
              const checked = settings.icoSizes.includes(size);
              return (
                <label key={size} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        icoSizes: checked
                          ? settings.icoSizes.filter((entry) => entry !== size)
                          : [...settings.icoSizes, size],
                      })
                    }
                    className="accent-primary"
                  />
                  {size}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="convert-backdrop">Backdrop</Label>
        <div className="flex items-center gap-3">
          <input
            id="convert-backdrop"
            type="color"
            value={settings.backdrop ?? "#ffffff"}
            disabled={settings.backdrop === null}
            onChange={(event) => onChange({ backdrop: event.target.value })}
            className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
          />
          {supportsTransparency && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={settings.backdrop === null}
                onCheckedChange={(transparent) =>
                  onChange({ backdrop: transparent ? null : "#ffffff" })
                }
              />
              Transparent
            </label>
          )}
        </div>
      </div>

      {!isIcon && (
        <div className="space-y-1.5">
          <Label htmlFor="convert-max-width">Max size (px)</Label>
          <div className="flex items-center gap-2">
            <input
              id="convert-max-width"
              type="number"
              min={1}
              placeholder="width"
              value={settings.maxWidth ?? ""}
              onChange={(event) => onChange({ maxWidth: numberOrNull(event.target.value) })}
              className="h-9 w-full rounded-md border border-border bg-transparent px-2 text-sm"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              ×
            </span>
            <input
              type="number"
              min={1}
              placeholder="height"
              aria-label="Max height in pixels"
              value={settings.maxHeight ?? ""}
              onChange={(event) => onChange({ maxHeight: numberOrNull(event.target.value) })}
              className="h-9 w-full rounded-md border border-border bg-transparent px-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to keep the original size. Images are never enlarged.
          </p>
        </div>
      )}

      {hasSvg && !isIcon && (
        <div className="space-y-1.5">
          <Label htmlFor="convert-svg-size">SVG render size (px)</Label>
          <input
            id="convert-svg-size"
            type="number"
            min={16}
            max={MAX_SVG_RENDER_PX}
            value={settings.svgRenderSize}
            onChange={(event) =>
              onChange({
                svgRenderSize: Math.min(
                  MAX_SVG_RENDER_PX,
                  Math.max(16, Number(event.target.value) || 16),
                ),
              })
            }
            className="h-9 w-full rounded-md border border-border bg-transparent px-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Longest edge of the rasterised vector.</p>
        </div>
      )}
    </div>
  );
}
