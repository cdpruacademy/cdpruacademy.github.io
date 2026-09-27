"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-lg border border-gray-200 bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md",
  {
    variants: {
      variant: {
        default: "bg-gray-900 text-white border-gray-800",
        dark: "bg-gray-900 text-white border-gray-800",
        light: "bg-white text-gray-800 border-gray-200",
        destructive: "bg-[#ED1C24] text-white border-[#B3141A]",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const Tooltip: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
> = ({ delayDuration = 300, ...props }) => (
  <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />
);

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipProvider: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>
> = ({ delayDuration = 300, skipDelayDuration = 100, ...props }) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  />
);

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipVariants> {}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, variant, size, sideOffset = 4, ...props }, ref) => {
  return (
    <AnimatePresence>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn("relative z-50", className)}
        asChild
        {...props}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 5 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            duration: 0.1,
          }}
          className={cn(tooltipVariants({ variant, size }), className)}
        >
          {props.children}
        </motion.div>
      </TooltipPrimitive.Content>
    </AnimatePresence>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  tooltipVariants,
  type TooltipContentProps,
};
