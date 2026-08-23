"use client";

import type React from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  children = "Remover"
}: {
  message: string;
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removendo..." : children}
    </Button>
  );
}
