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
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
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

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    }
    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {!isEditing ? (
        <motion.div
          key="text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`cursor-pointer hover:bg-neutral-100 hover:ring-2 hover:ring-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1 -ml-1 min-w-[20px] min-h-[1.5em] transition-colors ${textClassName} ${!value ? 'text-neutral-400 italic print:hidden' : ''}`}
          style={style}
          tabIndex={0}
          onClick={() => setIsEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsEditing(true);
            }
          }}
        >
          {value || placeholder}
        </motion.div>
      ) : (
        <motion.div
          key="input"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 -left-1 -right-1 z-10"
        >
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              style={style}
              className={`w-full bg-white border border-primary-500 rounded px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${textClassName}`}
              rows={Math.max(3, tempValue.split('\n').length)}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleSave}
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
