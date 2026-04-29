"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AgeGate() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already verified age
    const isVerified = localStorage.getItem("ageVerified");
    if (!isVerified) {
      setIsOpen(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem("ageVerified", "true");
    setIsOpen(false);
  };

  const handleDeny = () => {
    window.location.href = "https://www.google.com";
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* Prevent closing without action */ }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Age Verification</h2>
            <p className="text-muted-foreground">
              This website contains content intended only for adults. Are you 18 years of age or older?
            </p>
          </div>
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={handleDeny}>
              No, I am under 18
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              Yes, I am 18+
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}