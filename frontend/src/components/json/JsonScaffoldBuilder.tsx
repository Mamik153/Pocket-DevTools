import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addScaffoldChild,
  createInitialScaffold,
  isContainerType,
  removeScaffoldNode,
  scaffoldToPrettyJson,
  type ScaffoldNode,
  type ScaffoldNodeType,
  updateScaffoldNodeKey,
  updateScaffoldNodeType,
} from "@/lib/jsonScaffold";
import { cn } from "@/lib/utils";

interface JsonScaffoldBuilderProps {
  onInsertLeft: (json: string) => void;
  onInsertRight: (json: string) => void;
}

interface ScaffoldNodeEditorProps {
  node: ScaffoldNode;
  depth: number;
  parentType?: ScaffoldNodeType;
  isRoot?: boolean;
  onNodeTypeChange: (id: string, type: ScaffoldNodeType) => void;
  onNodeKeyChange: (id: string, key: string) => void;
  onAddChild: (id: string) => void;
  onRemove: (id: string) => void;
}

const NODE_TYPE_OPTIONS: ScaffoldNodeType[] = [
  "string",
  "number",
  "boolean",
  "null",
  "object",
  "array",
];

function ScaffoldNodeEditor({
  node,
  depth,
  parentType,
  isRoot = false,
  onNodeTypeChange,
  onNodeKeyChange,
  onAddChild,
  onRemove,
}: ScaffoldNodeEditorProps) {
  const showKeyInput = parentType === "object";
  const canHaveChildren = isContainerType(node.type);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-md border border-border/70 bg-secondary/20 p-3",
          depth > 0 ? "ml-4" : null,
        )}
      >
        <div className="grid gap-2 lg:grid-cols-[1fr_160px_auto_auto] lg:items-center">
          {showKeyInput ? (
            <Input
              value={node.key ?? ""}
              onChange={(event) => onNodeKeyChange(node.id, event.target.value)}
              placeholder="field_name"
              aria-label="Scaffold field name"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {isRoot ? "Root object" : "Array item"}
            </p>
          )}

          <select
            value={node.type}
            onChange={(event) => onNodeTypeChange(node.id, event.target.value as ScaffoldNodeType)}
            className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm text-foreground"
            aria-label="Scaffold node type"
          >
            {NODE_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>

          {canHaveChildren ? (
            <Button size="sm" variant="secondary" onClick={() => onAddChild(node.id)}>
              <Plus className="h-4 w-4" /> Add child
            </Button>
          ) : (
            <div />
          )}

          {!isRoot ? (
            <Button size="sm" variant="ghost" onClick={() => onRemove(node.id)}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {canHaveChildren ? (
        node.children.length ? (
          <div className="space-y-2">
            {node.children.map((child) => (
              <ScaffoldNodeEditor
                key={child.id}
                node={child}
                depth={depth + 1}
                parentType={node.type}
                onNodeTypeChange={onNodeTypeChange}
                onNodeKeyChange={onNodeKeyChange}
                onAddChild={onAddChild}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : (
          <p className="ml-4 text-xs text-muted-foreground">No children yet. Add one to build nested JSON.</p>
        )
      ) : null}
    </div>
  );
}

export function JsonScaffoldBuilder({ onInsertLeft, onInsertRight }: JsonScaffoldBuilderProps) {
  const [rootNode, setRootNode] = useState<ScaffoldNode>(() => createInitialScaffold());

  const previewJson = useMemo(() => scaffoldToPrettyJson(rootNode), [rootNode]);

  const handleReset = () => {
    setRootNode(createInitialScaffold());
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Scaffold Builder</CardTitle>
          <CardDescription>Build JSON structure with field names, types, and nested containers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Reset scaffold
            </Button>
          </div>

          <ScaffoldNodeEditor
            node={rootNode}
            depth={0}
            isRoot
            onNodeTypeChange={(id, type) => setRootNode((previous) => updateScaffoldNodeType(previous, id, type))}
            onNodeKeyChange={(id, key) => setRootNode((previous) => updateScaffoldNodeKey(previous, id, key))}
            onAddChild={(id) => setRootNode((previous) => addScaffoldChild(previous, id))}
            onRemove={(id) => setRootNode((previous) => removeScaffoldNode(previous, id))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scaffold Output</CardTitle>
          <CardDescription>Live preview generated from the scaffold model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={previewJson}
            readOnly
            className="min-h-[360px] font-mono text-sm"
            aria-label="Scaffold JSON output"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onInsertLeft(previewJson)}>Insert into Left</Button>
            <Button variant="secondary" onClick={() => onInsertRight(previewJson)}>
              Insert into Right
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
