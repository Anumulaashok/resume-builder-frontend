import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface InlineEditProps {
  value: string;
  onChange?: (val: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  textClassName?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
  ariaLabel?: string;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onChange,
  multiline = false,
  className = "",
  placeholder = "Click to edit",
  textClassName = "",
  style,
  readOnly = false,
  ariaLabel,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const previewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const ignoreBlurRef = useRef(false);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      previewRef.current?.focus();
    }
  }, [isEditing]);

  if (readOnly || !onChange) {
    if (!value) return null;
    return (
      <div className={`relative ${className}`}>
        <span className={textClassName} style={style}>{value}</span>
      </div>
    );
  }

  const accessibleLabel = ariaLabel ?? `Inline edit: ${value || placeholder}`;

  const startEditing = () => {
    ignoreBlurRef.current = false;
    setTempValue(value);
    setIsEditing(true);
  };

  const commitSave = () => {
    ignoreBlurRef.current = true;
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (ignoreBlurRef.current) return;
    shouldRestoreFocusRef.current = !e.relatedTarget;
    commitSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      shouldRestoreFocusRef.current = true;
      commitSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      ignoreBlurRef.current = true;
      shouldRestoreFocusRef.current = true;
      setTempValue(value);
      setIsEditing(false);
    }
  };

  const handlePreviewKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      startEditing();
    }
  };

  const isEmpty = !value || !value.trim();

  return (
    <div className={`relative group ${isEmpty && !isEditing ? "print:hidden" : ""} ${className}`}>
      {!isEditing ? (
        <motion.div
          ref={previewRef}
          key="text"
          role="button"
          tabIndex={0}
          aria-label={accessibleLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className={`cursor-pointer hover:bg-neutral-100 hover:ring-2 hover:ring-primary-300 focus-ring focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 print:!bg-transparent print:!ring-0 print:!px-0 print:!ml-0 print:ring-0 rounded px-1 -ml-1 min-w-[20px] min-h-[1.5em] transition-colors ${textClassName} ${!value ? 'text-neutral-400 italic' : ''}`}
          style={style}
          onClick={startEditing}
          onKeyDown={handlePreviewKeyDown}
        >
          {value || placeholder}
        </motion.div>
      ) : (
        <motion.div
          key="input"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute -top-1 -left-1 -right-1 z-10"
        >
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              aria-label={accessibleLabel}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={style}
              className={`w-full bg-white border border-primary-500 rounded px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${textClassName}`}
              rows={Math.max(3, tempValue.split('\n').length)}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              aria-label={accessibleLabel}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={style}
              className={`w-full bg-white border border-primary-500 rounded px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${textClassName}`}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};
