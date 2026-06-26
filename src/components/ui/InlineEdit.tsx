import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InlineEditProps {
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  textClassName?: string;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onChange,
  multiline = false,
  className = "",
  placeholder = "Click to edit",
  textClassName = "",
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
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`cursor-pointer hover:bg-gray-100 hover:ring-2 hover:ring-blue-300 rounded px-1 -ml-1 min-w-[20px] min-h-[1.5em] transition-colors ${textClassName} ${!value ? 'text-gray-400 italic' : ''}`}
            onClick={() => setIsEditing(true)}
          >
            {value || placeholder}
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute -top-1 -left-1 -right-1 z-10"
          >
            {multiline ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={`w-full bg-white border border-blue-500 rounded px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${textClassName}`}
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
                className={`w-full bg-white border border-blue-500 rounded px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${textClassName}`}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
