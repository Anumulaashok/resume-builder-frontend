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

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = "",
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      type="button"
      onClick={() => !context.disabled && context.setIsOpen(!context.isOpen)}
      disabled={context.disabled}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
        context.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-neutral-50"
      } ${className}`}
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
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  if (!context || !context.isOpen) return null;

  return (
    <div
      ref={ref}
      className={`absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-control shadow-card-hover ${className}`}
    >
      {children}
    </div>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({
  placeholder,
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  return <span>{context.value || placeholder}</span>;
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
