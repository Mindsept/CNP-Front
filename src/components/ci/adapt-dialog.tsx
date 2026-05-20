import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

interface AdaptDialogProps {
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (instruction: string) => void;
}

export function AdaptDialog({
  open,
  loading,
  onOpenChange,
  onSubmit,
}: AdaptDialogProps) {
  const [instruction, setInstruction] = useState("");

  useEffect(() => {
    if (open) setInstruction("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Adapt with AI
            </span>
          </DialogTitle>
          <DialogDescription>
            Describe what you want to change. The platform will adapt the
            workflow while keeping the rest intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="instruction">Instruction</Label>
          <Textarea
            id="instruction"
            rows={5}
            placeholder="Example: Ajoute un job de lint avec ruff avant les tests."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(instruction.trim())}
            loading={loading}
            disabled={!instruction.trim()}
          >
            Apply adaptation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
