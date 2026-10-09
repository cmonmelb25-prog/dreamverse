'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gem } from "lucide-react";
import Link from "next/link";

interface SubscribePopupProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  feature: string;
}

export function SubscribePopup({
  open,
  onOpenChangeAction,
  feature,
}: SubscribePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="flex flex-col items-center">
          <div className="rounded-full bg-primary/10 p-3 border border-primary/20 mb-4">
            <Gem className="h-8 w-8 text-primary" />
          </div>

          <DialogTitle>Unlock VIP Access</DialogTitle>

          <DialogDescription className="mt-2" id="subscribe-description">
            Become a VIP to unlock {feature} and more exclusive content!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Button asChild size="lg" className="animated-border-button w-full">
            <Link href="/settings">
              <span>Upgrade to VIP</span>
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
