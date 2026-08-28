"use client";

import type React from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  children = "Remover",
  pendingLabel = "Removendo...",
  icon = "trash",
  variant = "outline",
  size = "sm",
  className,
  disabled = false
}: {
  message: string;
  children?: React.ReactNode;
  pendingLabel?: string;
  icon?: "trash" | "none";
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || pending}
      onClick={(event) => {
        if (disabled) return;
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {icon === "trash" ? <Trash2 className="h-3.5 w-3.5" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
