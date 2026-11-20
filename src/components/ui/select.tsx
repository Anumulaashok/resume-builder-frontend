import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  selectedLabel?: React.ReactNode;
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

function collectOptionLabels(
  nodes: React.ReactNode,
  map: Map<string, React.ReactNode>
): void {
  React.Children.forEach(nodes, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      value?: unknown;
      children?: React.ReactNode;
    };
    if (typeof props.value === "string" && props.children !== undefined) {
      map.set(props.value, props.children);
      return;
    }
    if (props.children) {
      collectOptionLabels(props.children, map);
    }
  });
}

export const Select: React.FC<SelectProps> = ({
  children,
  value,
  defaultValue = "",
  onChange,
  disabled = false,
}) => {
  const isControlled = value !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>(
    value !== undefined ? value : defaultValue
  );

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const currentValue = isControlled ? value : selectedValue;

  const optionLabels = useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    collectOptionLabels(children, map);
    return map;
  }, [children]);

  const selectedLabel = currentValue ? optionLabels.get(currentValue) : undefined;

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);
    onChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        selectedLabel,
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = "",
  onClick,
  onKeyDown,
  ...rest
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      type="button"
      aria-expanded={context.isOpen}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && !context.disabled) {
          context.setIsOpen(!context.isOpen);
        }
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || context.disabled) return;
        if (e.key === "Escape" && context.isOpen) {
          e.stopPropagation();
          context.setIsOpen(false);
        } else if (e.key === "ArrowDown" && !context.isOpen) {
          e.preventDefault();
          context.setIsOpen(true);
        }
      }}
      disabled={context.disabled}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
        context.disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-neutral-50"
      } ${className}`}
      {...rest}
    >
      {children}
      <ChevronDown className="w-4 h-4 opacity-50" aria-hidden="true" />
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && context?.isOpen) {
        context.setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  const displayContent = context.value
    ? context.selectedLabel ?? context.value
    : placeholder;

  return <span>{displayContent}</span>;
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

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => context.onChange(value)}
      className={`w-full px-3 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:bg-primary-50 focus:text-primary-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
        isSelected ? "bg-primary-50 text-primary-700 font-medium" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

export { SelectContext };
