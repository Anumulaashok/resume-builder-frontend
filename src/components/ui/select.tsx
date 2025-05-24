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
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border rounded-md ${
        context.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
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
      className={`absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg ${className}`}
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
      className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
        context.value === value ? "bg-gray-50" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

export { SelectContext };
