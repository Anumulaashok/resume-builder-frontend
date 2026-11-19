import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { SectionType } from "../types/resume";
import {
  SECTION_FORM_REGISTRY,
  getSectionFormEntry,
} from "./sectionForms/registry";

export { SECTION_FORM_REGISTRY, getSectionFormEntry };

export interface ContntProps {
  type: SectionType;
  item: any;
}

export interface SectionEditorProps {
  content: ContntProps;
  onClose: () => void;
  onSave: (type: SectionType, item: any) => void;
}

const SectionEditors: React.FC<SectionEditorProps> = ({
  content,
  onClose,
  onSave,
}) => {
  if (!content) {
    return null;
  }

  const registryEntry = getSectionFormEntry(content.type);
  if (!registryEntry) {
    return (
      <DialogBox title="Unsupported Section" onClose={onClose}>
        <p className="text-sm text-gray-600">
          Unknown content type: {String(content.type)}
        </p>
      </DialogBox>
    );
  }

  const FormComponent = registryEntry.component;

  return (
    <DialogBox title={registryEntry.title} onClose={onClose} hideFooter>
      <FormComponent
        initialContent={content.item}
        onSave={(updatedItem) => onSave(content.type, updatedItem)}
        onCancel={onClose}
      />
    </DialogBox>
  );
};

export const DialogBox: React.FC<{
  title?: string;
  id?: string;
  onClose?: () => void;
  children: React.ReactNode;
  onSave?: (id: string) => void;
  hideFooter?: boolean;
  saveText?: string;
  className?: string;
  [key: string]: any;
}> = ({
  title,
  onClose,
  children,
  onSave,
  id,
  hideFooter = false,
  saveText,
  className = "",
}) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      className={`fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm w-full ${className}`}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-auto max-h-[90vh] overflow-y-auto text-gray-900"
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-5">
            {title ? (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            ) : (
              <span />
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                title="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {children}

        {!hideFooter && (onClose || (onSave && id)) && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {onSave && id ? "Cancel" : "Close"}
              </button>
            )}
            {onSave && id && (
              <button
                type="button"
                onClick={() => onSave(id)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  saveText === "Delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saveText ?? "Save"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SectionEditors;
