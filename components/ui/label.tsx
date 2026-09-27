"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-foreground",
        destructive: "text-destructive",
        muted: "text-muted-foreground",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
  optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  (
    { className, variant, size, required, optional, children, ...props },
    ref,
  ) => {
    return (
      <label
        ref={ref}
        className={cn(labelVariants({ variant, size, className }))}
        {...props}
      >
        {children}
        {required && (
          <span
            className="text-destructive ml-1 text-[#ED1C24] font-bold"
            aria-label="required"
          >
            *
          </span>
        )}
        {optional && !required && (
          <span className="text-muted-foreground ml-1 font-normal text-xs text-gray-400">
            (optional)
          </span>
        )}
      </label>
    );
  },
);

Label.displayName = "Label";

export { Label, labelVariants };
