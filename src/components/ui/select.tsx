import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}


export const Select: React.FC<SelectProps> = ({
  children,
  value = "",
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);
    onChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: selectedValue,
        onChange: handleChange,
        isOpen,
        setIsOpen,
        disabled,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = "",
  onClick,
  ...rest
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={context.isOpen}
      onClick={(e) => {
        onClick?.(e);
        if (!context.disabled) {
          context.setIsOpen(!context.isOpen);
        }
      }}
      disabled={context.disabled}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
        context.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-neutral-50"
      } ${className}`}
      {...rest}
    >
      {children}
      <ChevronDown className="w-4 h-4 opacity-50" />
    </button>
  );
};

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = "",
}) => {
  const context = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!context?.isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        context?.setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [context]);

  if (!context || !context.isOpen) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      className={`absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-control shadow-card-hover ${className}`}
    >
      {children}
    </div>
  );
};

export const SelectValue: React.FC<{
  placeholder?: string;
  displayValue?: string;
}> = ({ placeholder, displayValue }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  return <span>{displayValue || context.value || placeholder}</span>;
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  className = "",
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  return (
    <button
      type="button"
      onClick={() => context.onChange(value)}
      className={`w-full px-3 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:bg-primary-50 focus:text-primary-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
        context.value === value ? "bg-primary-50 text-primary-700 font-medium" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

export { SelectContext };
