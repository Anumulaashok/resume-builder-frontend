import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { resumeService } from "../services/resume.service";
import { ISharing, IPrivacySettings } from "../types/resume";

interface ShareModalProps {
  resumeId: string;
  isOpen: boolean;
  onClose: () => void;
  initialSharing?: ISharing;
  resumeTitle?: string;
  onSharingUpdated?: (sharing: ISharing) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  resumeId,
  isOpen,
  onClose,
  initialSharing,
  resumeTitle = "Resume",
  onSharingUpdated,
}) => {
  const resolvePrivacy = (sharing?: any): IPrivacySettings => {
    const p = sharing?.privacy || sharing?.privacySettings;
    return {
      hideEmail: p?.hideEmail ?? false,
      hidePhone: p?.hidePhone ?? false,
      hideAddress: p?.hideAddress ?? false,
    };
  };

  const [isPublic, setIsPublic] = useState(initialSharing?.isPublic ?? false);
  const [shareToken, setShareToken] = useState<string | null>(
    initialSharing?.shareToken ?? null
  );
  const [privacy, setPrivacy] = useState<IPrivacySettings>(() =>
    resolvePrivacy(initialSharing)
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialSharing) {
        setIsPublic(initialSharing.isPublic ?? false);
        setShareToken(initialSharing.shareToken ?? null);
        setPrivacy(resolvePrivacy(initialSharing));
      } else if (resumeId) {
        // Fetch current share settings
        setLoading(true);
        resumeService
          .getShareSettings(resumeId)
          .then((settings) => {
            if (settings) {
              setIsPublic(settings.isPublic ?? false);
              setShareToken(settings.shareToken ?? null);
              setPrivacy(resolvePrivacy(settings));
            }
          })
          .catch(() => {
            // If fetching fails, fallback to defaults
          })
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, resumeId, initialSharing]);

  if (!isOpen) return null;

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : "";

  const handleToggleSharing = async () => {
    const newPublicState = !isPublic;
    setLoading(true);
    try {
      const updated = await resumeService.updateShareSettings(resumeId, {
        isPublic: newPublicState,
        privacy,
        privacySettings: privacy,
      });
      setIsPublic(updated.isPublic);
      setShareToken(updated.shareToken ?? null);
      setPrivacy(resolvePrivacy(updated));
      onSharingUpdated?.(updated);
      toast.success(
        newPublicState
          ? "Public link sharing enabled!"
          : "Public link sharing revoked."
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sharing settings");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (
      !window.confirm(
        "Are you sure you want to regenerate the share link? Anyone with the old link will lose access immediately."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const updated = await resumeService.updateShareSettings(resumeId, {
        isPublic: true,
        regenerateToken: true,
        privacy,
        privacySettings: privacy,
      });
      setIsPublic(updated.isPublic);
      setShareToken(updated.shareToken ?? null);
      setPrivacy(resolvePrivacy(updated));
      onSharingUpdated?.(updated);
      toast.success("New share link generated!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to regenerate share link");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrivacy = async (field: keyof IPrivacySettings) => {
    const updatedPrivacy = {
      ...privacy,
      [field]: !privacy[field],
    };
    setPrivacy(updatedPrivacy);

    // Save privacy settings
    try {
      const updated = await resumeService.updateShareSettings(resumeId, {
        isPublic,
        privacy: updatedPrivacy,
        privacySettings: updatedPrivacy,
      });
      onSharingUpdated?.(updated);
      toast.success("Privacy settings updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update privacy settings");
      // Revert state on error
      setPrivacy(privacy);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback
      toast.error("Failed to copy link automatically");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-gray-900 border border-gray-700 text-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transition-all transform"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5 text-blue-500" />
            <h3
              id="share-modal-title"
              className="text-lg font-semibold text-white truncate"
            >
              Share "{resumeTitle}"
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Public Link Access Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div>
              <h4 className="text-sm font-medium text-white">
                Public Link Access
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {isPublic
                  ? "Anyone with the link can view this resume in read-only mode."
                  : "Only you can view this resume. Link access is disabled."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSharing}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isPublic ? "bg-blue-600" : "bg-gray-600"
              }`}
              role="switch"
              aria-checked={isPublic}
              data-testid="toggle-public-share"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Share Link & Actions (Visible when sharing is enabled) */}
          {isPublic && shareToken ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="share-link-input" className="block text-xs font-medium text-gray-300 mb-1.5">
                  Shareable Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="share-link-input"
                    type="text"
                    readOnly
                    value={shareUrl}
                    data-testid="share-link-input"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono select-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    data-testid="copy-share-link"
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {copied ? (
                      <>
                        <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4 mr-1.5" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={loading}
                    title="Revoke and generate a new token"
                    data-testid="regenerate-share-link"
                    className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-gray-800 rounded-lg border border-dashed border-gray-700">
              <LinkIcon className="h-10 w-10 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-300 font-medium">
                Public sharing is currently turned off
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Toggle "Public Link Access" on to create an unlisted link and
                customize contact privacy.
              </p>
            </div>
          )}

          {/* Privacy Controls */}
          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheckIcon className="h-5 w-5 text-indigo-400" />
              <h4 className="text-sm font-semibold text-white">
                Contact Field Privacy Controls
              </h4>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Hidden contact fields are completely redacted from public API
              payloads to prevent sensitive data leaks.
            </p>

            <div className="space-y-3 bg-gray-800 p-4 rounded-lg border border-gray-700">
              {/* Hide Email */}
              <div className="flex items-center justify-between">
                <label htmlFor="hide-email-toggle" className="flex items-center space-x-2 cursor-pointer flex-1 mr-4">
                  <EyeSlashIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-gray-200 font-medium block">
                      Hide Email Address
                    </span>
                    <p className="text-xs text-gray-400">
                      {privacy.hideEmail
                        ? "Email is completely hidden from public viewers"
                        : "Email is visible on public resume"}
                    </p>
                  </div>
                </label>
                <input
                  id="hide-email-toggle"
                  type="checkbox"
                  checked={privacy.hideEmail}
                  onChange={() => handleTogglePrivacy("hideEmail")}
                  data-testid="hide-email-toggle"
                  className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Hide Phone */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <label htmlFor="hide-phone-toggle" className="flex items-center space-x-2 cursor-pointer flex-1 mr-4">
                  <EyeSlashIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-gray-200 font-medium block">
                      Hide Phone Number
                    </span>
                    <p className="text-xs text-gray-400">
                      {privacy.hidePhone
                        ? "Phone number is completely hidden from public viewers"
                        : "Phone number is visible on public resume"}
                    </p>
                  </div>
                </label>
                <input
                  id="hide-phone-toggle"
                  type="checkbox"
                  checked={privacy.hidePhone}
                  onChange={() => handleTogglePrivacy("hidePhone")}
                  data-testid="hide-phone-toggle"
                  className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Hide Address */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <label htmlFor="hide-address-toggle" className="flex items-center space-x-2 cursor-pointer flex-1 mr-4">
                  <EyeSlashIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-gray-200 font-medium block">
                      Hide Physical Address
                    </span>
                    <p className="text-xs text-gray-400">
                      {privacy.hideAddress
                        ? "Physical address is completely hidden from public viewers"
                        : "Address is visible on public resume"}
                    </p>
                  </div>
                </label>
                <input
                  id="hide-address-toggle"
                  type="checkbox"
                  checked={privacy.hideAddress}
                  onChange={() => handleTogglePrivacy("hideAddress")}
                  data-testid="hide-address-toggle"
                  className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-850 border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
