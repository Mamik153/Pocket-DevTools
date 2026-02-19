import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";

let mermaidInitialized = false;
let mermaidInstanceCounter = 0;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
  });
  mermaidInitialized = true;
}

interface MermaidDiagramProps {
  source: string;
  id?: string;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

export function MermaidDiagram({ source, id: idProp }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [diagramSize, setDiagramSize] = useState<{ width: number; height: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const trimmed = source.trim();
    const renderId = idProp ?? `mermaid-${(mermaidInstanceCounter++).toString(36)}-${Date.now()}`;
    if (!container || !trimmed) {
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    setDiagramSize(null);

    ensureMermaidInitialized();

    const run = async () => {
      try {
        const result = await mermaid.render(renderId, trimmed);
        container.innerHTML = result.svg;
        result.bindFunctions?.(container);
        const svg = container.querySelector("svg");
        if (svg) {
          const bbox = svg.getBBox();
          setDiagramSize({ width: bbox.width, height: bbox.height });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to render diagram";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [source, idProp]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleFullscreenClick = () => {
    if (isFullscreen) {
      void document.exitFullscreen();
    } else {
      fullscreenRef.current?.requestFullscreen();
    }
  };

  if (error) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        role="alert"
      >
        <p className="font-medium">Diagram error</p>
        <p className="mt-1 text-xs">{error}</p>
        <pre className="mt-2 max-h-40 overflow-auto rounded border border-amber-200 bg-white/80 p-2 font-mono text-xs dark:border-amber-800 dark:bg-black/20">
          {source}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={fullscreenRef}
      className="mermaid-diagram-container relative my-4 max-w-full overflow-auto rounded-3xl border border-border bg-muted/30 p-4 h-[500px]"
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          Rendering…
        </div>
      )}
      {!isLoading && diagramSize && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            className="bg-muted hover:bg-muted/80 backdrop-blur-sm"
            onClick={() => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP))}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            className="bg-muted hover:bg-muted/80 backdrop-blur-sm"
            onClick={() => setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP))}
          >
            <ZoomOut className="size-4" />
          </Button>
          {/* <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
            onClick={handleFullscreenClick}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button> */}
        </div>
      )}
      <div className="overflow-auto min-h-[120px]">
        <div
          style={{
            width: diagramSize ? diagramSize.width * scale : 0,
            height: diagramSize ? diagramSize.height * scale : 0,
          }}
        >
          <div
            ref={containerRef}
            style={{
              transform: diagramSize ? `scale(${scale})` : "none",
              transformOrigin: "top left",
              width: diagramSize?.width ?? 0,
              height: diagramSize?.height ?? 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}
