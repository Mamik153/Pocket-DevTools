import { FileStack, Image as ImageIcon, Shrink, Unlock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompressPanel } from "@/components/pdf/CompressPanel";
import { MergePanel } from "@/components/pdf/MergePanel";
import { ToImagePanel } from "@/components/pdf/ToImagePanel";
import { UnlockPanel } from "@/components/pdf/UnlockPanel";

export type PdfMode = "merge" | "unlock" | "to-image" | "compress";

interface ModeConfig {
  id: PdfMode;
  label: string;
  icon: LucideIcon;
  Panel: () => React.JSX.Element;
}

const MODES: ModeConfig[] = [
  { id: "merge", label: "Merge", icon: FileStack, Panel: MergePanel },
  { id: "unlock", label: "Unlock", icon: Unlock, Panel: UnlockPanel },
  { id: "to-image", label: "To Image", icon: ImageIcon, Panel: ToImagePanel },
  { id: "compress", label: "Compress", icon: Shrink, Panel: CompressPanel },
];

export function PdfToolkit() {
  return (
    // Radix Tabs supplies the roles, aria wiring and arrow-key navigation.
    // Panels are unmounted when inactive, which each panel's cleanup relies on.
    <Tabs defaultValue="merge" className="space-y-5">
      <TabsList className="h-auto flex-wrap">
        {MODES.map(({ id, label, icon: Icon }) => (
          <TabsTrigger key={id} value={id}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {MODES.map(({ id, Panel }) => (
        <TabsContent key={id} value={id}>
          <Panel />
        </TabsContent>
      ))}
    </Tabs>
  );
}
