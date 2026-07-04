"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  saving?: boolean;
  onSave: (name: string) => void;
}

export function SavePlanDialog({ open, onOpenChange, defaultName, saving, onSave }: SavePlanDialogProps) {
  const [name, setName] = useState(defaultName ?? "My Race Plan");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Race Plan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 py-2">
          <Label htmlFor="plan-name">Plan name</Label>
          <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving || !name.trim()} onClick={() => onSave(name.trim())}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DialogTrigger as SavePlanDialogTrigger };
