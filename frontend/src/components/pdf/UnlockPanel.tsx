import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, LockOpen } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decryptPdf, downloadBytes, inspectPdf } from "@/lib/pdf";

type Status =
  | { kind: "idle" }
  | { kind: "not-encrypted" }
  | { kind: "needs-password" }
  | { kind: "working" }
  | { kind: "done"; bytes: Uint8Array; rebuilt: boolean }
  | { kind: "error"; message: string };

export function UnlockPanel() {
  const [file, setFile] = useState<AcceptedPdf | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // The password never outlives the component.
  useEffect(() => () => setPassword(""), []);

  const attempt = useCallback(async (target: AcceptedPdf, candidate: string) => {
    setStatus({ kind: "working" });
    try {
      const result = await decryptPdf(target.bytes, candidate);
      setStatus({ kind: "done", bytes: result.bytes, rebuilt: result.rebuilt });
    } catch {
      setStatus(
        candidate === ""
          ? { kind: "needs-password" }
          : { kind: "error", message: "That password did not work. Try again." },
      );
    }
  }, []);

  const onAccept = useCallback(
    async ([accepted]: AcceptedPdf[]) => {
      setFile(accepted);
      setPassword("");
      setStatus({ kind: "working" });
      try {
        const info = await inspectPdf(accepted.bytes);
        if (!info.isEncrypted) {
          setStatus({ kind: "not-encrypted" });
          return;
        }
        // An empty password clears the whole permission-restricted class with
        // no prompt at all.
        await attempt(accepted, "");
      } catch {
        setStatus({ kind: "error", message: "This PDF could not be read. It may be corrupt." });
      }
    },
    [attempt],
  );

  return (
    <div className="space-y-4">
      <PdfDropzone label="Drop a locked PDF here, or click to choose" onAccept={(files) => void onAccept(files)} />

      <p className="text-xs text-muted-foreground">
        Works on PDFs you can already open, and on password-protected PDFs when you
        enter the password. It does not guess or crack passwords.
      </p>

      {status.kind === "working" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Working…
        </p>
      )}

      {status.kind === "not-encrypted" && (
        <p className="text-sm text-muted-foreground">
          {file?.name} is not locked — there is nothing to remove.
        </p>
      )}

      {(status.kind === "needs-password" || status.kind === "error") && file && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void attempt(file, password);
          }}
        >
          <Label htmlFor="pdf-password">Password for {file.name}</Label>
          <div className="flex gap-2">
            <Input
              id="pdf-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter the PDF password"
            />
            <Button type="submit" disabled={password.length === 0}>
              <LockOpen className="h-4 w-4" aria-hidden="true" />
              Unlock
            </Button>
          </div>
          {status.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          )}
        </form>
      )}

      {status.kind === "done" && file && (
        <div className="space-y-2 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm">Unlocked. The copy has no password and no restrictions.</p>
          {status.rebuilt && (
            <p className="text-sm text-muted-foreground">
              This file needed a page-level rebuild, so bookmarks and form fields may
              not have carried over.
            </p>
          )}
          <Button onClick={() => downloadBytes(status.bytes, `unlocked-${file.name}`)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download unlocked PDF
          </Button>
        </div>
      )}
    </div>
  );
}
