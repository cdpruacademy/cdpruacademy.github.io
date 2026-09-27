"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, X } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED1C24] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-xs",
  {
    variants: {
      variant: {
        default: "border-gray-300",
        destructive: "border-[#ED1C24] focus-visible:ring-[#ED1C24]",
        ghost: "border-transparent bg-gray-100 focus-visible:bg-white focus-visible:border-gray-300",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2.5 py-1 text-xs",
        lg: "h-10 px-4 py-2",
        xl: "h-12 px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = "text",
      leftIcon,
      rightIcon,
      error,
      clearable,
      onClear,
      value,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(
      props.defaultValue || "",
    );
    
    const internalRef = React.useRef<HTMLInputElement>(null);
    const inputRef = ref || internalRef;

    const inputVariant = error ? "destructive" : variant;
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    const isControlled = value !== undefined;
    const inputValue = isControlled ? value : internalValue;
    const showClearButton =
      clearable && inputValue && String(inputValue).length > 0;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      props.onChange?.(e);
    };

    const handleClear = () => {
      const inputElement = typeof inputRef === 'function' ? null : inputRef?.current;
      
      if (inputElement) {
        inputElement.value = "";
        const event = new Event('input', { bubbles: true });
        Object.defineProperty(event, 'target', {
          writable: false,
          value: inputElement
        });
        inputElement.dispatchEvent(event);
      }

      if (!isControlled) {
        setInternalValue("");
      }
      
      onClear?.();
      
      if (props.onChange) {
        const syntheticEvent = {
          target: { value: "" },
          currentTarget: { value: "" },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLInputElement>;
        
        props.onChange(syntheticEvent);
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 [&_svg]:size-4 [&_svg]:shrink-0 z-10">
            {leftIcon}
          </div>
        )}

        <input
          type={actualType}
          className={cn(
            inputVariants({ variant: inputVariant, size, className }),
            leftIcon && "pl-9",
            (rightIcon || isPassword || showClearButton) && "pr-9"
          )}
          ref={inputRef}
          {...(isControlled
            ? { value: inputValue }
            : { defaultValue: props.defaultValue })}
          onChange={handleInputChange}
          {...(({ defaultValue, ...rest }) => rest)(props)}
        />

        {(rightIcon || isPassword || showClearButton) && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {rightIcon && (
              <div className="text-gray-400 [&_svg]:size-4 [&_svg]:shrink-0">
                {rightIcon}
              </div>
            )}

            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-700 transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0"
                tabIndex={-1}
              >
                <X />
              </button>
            )}

            {isPassword && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-gray-700 transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input, inputVariants };
