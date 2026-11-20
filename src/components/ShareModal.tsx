import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  XMarkIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { resumeService } from "../services/resume.service";
import {
  ISharing,
  IPrivacySettings,
  IDailyView,
  IShareStats,
} from "../types/resume";
import { Skeleton } from "./ui/skeleton";

interface ShareModalProps {
  resumeId: string;
  isOpen: boolean;
  onClose: () => void;
  initialSharing?: ISharing;
  resumeTitle?: string;
  onSharingUpdated?: (sharing: ISharing) => void;
}

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 40;
const SLUG_DEBOUNCE_MS = 350;

const RESERVED_SLUGS = new Set<string>([
  "about",
  "account",
  "admin",
  "administrator",
  "analytics",
  "api",
  "api-docs",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "career",
  "careers",
  "config",
  "contact",
  "create",
  "cv",
  "dashboard",
  "delete",
  "dev",
  "docs",
  "download",
  "edit",
  "editor",
  "embed",
  "explore",
  "export",
  "faq",
  "favicon",
  "features",
  "feed",
  "files",
  "forgot",
  "health",
  "help",
  "home",
  "import",
  "index",
  "internal",
  "job",
  "job-match",
  "jobs",
  "legal",
  "login",
  "logout",
  "manage",
  "me",
  "metrics",
  "my",
  "new",
  "null",
  "oauth",
  "onboarding",
  "owner",
  "p",
  "portfolio",
  "portfolios",
  "preview",
  "pricing",
  "print",
  "privacy",
  "profile",
  "public",
  "r",
  "register",
  "reset",
  "resume",
  "resumes",
  "robots",
  "root",
  "search",
  "security",
  "settings",
  "share",
  "shared",
  "sharing",
  "signin",
  "signout",
  "signup",
  "sitemap",
  "slug",
  "static",
  "stats",
  "status",
  "support",
  "swagger",
  "system",
  "team",
  "template",
  "templates",
  "terms",
  "test",
  "undefined",
  "uploads",
  "user",
  "users",
  "verify",
  "version",
  "view",
  "views",
  "webhook",
  "webhooks",
  "www",
]);

type SlugCheckStatus =
  | "idle"
  | "current"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export function validateSlugClient(
  slug: string
): { valid: boolean; reason?: string } {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    return {
      valid: false,
      reason: `Slug must be ${SLUG_MIN_LENGTH}–${SLUG_MAX_LENGTH} characters.`,
    };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      reason: "Use only lowercase letters, numbers, and hyphens.",
    };
  }
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return {
      valid: false,
      reason: "Slug cannot start or end with a hyphen.",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return {
      valid: false,
      reason: `"${slug}" is a reserved word and cannot be used.`,
    };
  }
  return { valid: true };
}

export function build30DaySeriesClient(
  dailyViews?: IDailyView[],
  now: Date = new Date()
): IDailyView[] {
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const byDate = new Map<string, number>();
  if (Array.isArray(dailyViews)) {
    for (const item of dailyViews) {
      if (item && typeof item.date === "string") {
        byDate.set(
          item.date,
          (byDate.get(item.date) || 0) + Math.max(0, Number(item.count) || 0)
        );
      }
    }
  }

  const series: IDailyView[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date(utcMidnight - offset * 24 * 60 * 60 * 1000);
    const dateStr = day.toISOString().slice(0, 10);
    series.push({
      date: dateStr,
      count: byDate.get(dateStr) || 0,
    });
  }
  return series;
}

function formatLastViewed(lastViewedAt?: string | null): string {
  if (!lastViewedAt) return "Never viewed";
  const parsed = new Date(lastViewedAt);
  if (Number.isNaN(parsed.getTime())) return "Never viewed";

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs >= 0 && diffMs < 60 * 1000) {
    return "Just now";
  }
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) {
    const mins = Math.floor(diffMs / (60 * 1000));
    return `${mins}m ago`;
  }
  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
    const hrs = Math.floor(diffMs / (60 * 60 * 1000));
    return `${hrs}h ago`;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBucketDateLabel(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return utcDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
  const [savedSlug, setSavedSlug] = useState<string | null>(
    initialSharing?.slug ?? null
  );
  const [draftSlug, setDraftSlug] = useState<string>(
    initialSharing?.slug ?? ""
  );
  const [slugStatus, setSlugStatus] = useState<SlugCheckStatus>(() =>
    initialSharing?.slug ? "current" : "idle"
  );
  const [slugMessage, setSlugMessage] = useState<string>("");
  const [savingSlug, setSavingSlug] = useState(false);

  const [privacy, setPrivacy] = useState<IPrivacySettings>(() =>
    resolvePrivacy(initialSharing)
  );
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Share analytics state
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<IShareStats>(() => ({
    viewCount: initialSharing?.viewCount ?? 0,
    lastViewedAt: initialSharing?.lastViewedAt ?? null,
    dailyViews: build30DaySeriesClient(initialSharing?.dailyViews),
  }));
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    if (!resumeId || typeof resumeService.getShareStats !== "function") {
      return;
    }
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await resumeService.getShareStats(resumeId);
      if (data && typeof data === "object") {
        setStats({
          viewCount: Number(data.viewCount) || 0,
          lastViewedAt: data.lastViewedAt ?? null,
          dailyViews: build30DaySeriesClient(data.dailyViews),
          isPublic: data.isPublic,
          slug: data.slug ?? null,
        });
        if (data.slug !== undefined && !initialSharing?.slug) {
          setSavedSlug((prev) => prev ?? data.slug ?? null);
          setDraftSlug((prev) => (prev ? prev : data.slug ?? ""));
        }
      }
    } catch (err: any) {
      setStatsError(err?.message || "Unable to load view statistics.");
    } finally {
      setStatsLoading(false);
    }
  }, [resumeId, initialSharing?.slug]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialSharing) {
      setIsPublic(initialSharing.isPublic ?? false);
      setShareToken(initialSharing.shareToken ?? null);
      const nextSlug = initialSharing.slug ?? null;
      setSavedSlug(nextSlug);
      setDraftSlug(nextSlug ?? "");
      setSlugStatus(nextSlug ? "current" : "idle");
      setSlugMessage("");
      setPrivacy(resolvePrivacy(initialSharing));
      setStats({
        viewCount: initialSharing.viewCount ?? 0,
        lastViewedAt: initialSharing.lastViewedAt ?? null,
        dailyViews: build30DaySeriesClient(initialSharing.dailyViews),
      });
    } else if (resumeId) {
      setLoading(true);
      resumeService
        .getShareSettings(resumeId)
        .then((settings) => {
          if (settings) {
            setIsPublic(settings.isPublic ?? false);
            setShareToken(settings.shareToken ?? null);
            const nextSlug = settings.slug ?? null;
            setSavedSlug(nextSlug);
            setDraftSlug(nextSlug ?? "");
            setSlugStatus(nextSlug ? "current" : "idle");
            setSlugMessage("");
            setPrivacy(resolvePrivacy(settings));
          }
        })
        .catch(() => {
          // Keep defaults if share settings fetch fails
        })
        .finally(() => setLoading(false));
    }

    fetchStats();
  }, [isOpen, resumeId, initialSharing, fetchStats]);

  // Keyboard Escape handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced live slug availability check
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = draftSlug.trim();

    if (!trimmed) {
      setSlugStatus("idle");
      setSlugMessage(
        savedSlug
          ? "Click Save to clear your custom URL."
          : "3–40 lowercase letters, numbers, or hyphens."
      );
      return;
    }

    if (savedSlug && trimmed === savedSlug) {
      setSlugStatus("current");
      setSlugMessage("Active custom URL for this resume.");
      return;
    }

    const validation = validateSlugClient(trimmed);
    if (!validation.valid) {
      setSlugStatus("invalid");
      setSlugMessage(validation.reason || "Invalid custom URL format.");
      return;
    }

    if (!resumeId || typeof resumeService.checkSlugAvailability !== "function") {
      setSlugStatus("available");
      setSlugMessage("Custom URL format looks good.");
      return;
    }

    let cancelled = false;
    setSlugStatus("checking");
    setSlugMessage("Checking availability...");

    const timer = setTimeout(async () => {
      try {
        const result = await resumeService.checkSlugAvailability(
          resumeId,
          trimmed
        );
        if (cancelled) return;
        if (!result || result.available) {
          setSlugStatus("available");
          setSlugMessage(`"/r/${trimmed}" is available!`);
        } else {
          setSlugStatus("unavailable");
          setSlugMessage(
            result.reason || "This custom URL slug is already taken."
          );
        }
      } catch (err: any) {
        if (cancelled) return;
        setSlugStatus("error");
        setSlugMessage(err?.message || "Could not verify availability.");
      }
    }, SLUG_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draftSlug, savedSlug, resumeId, isOpen]);

  const dailySeries = useMemo(
    () => build30DaySeriesClient(stats.dailyViews),
    [stats.dailyViews]
  );

  const maxDailyCount = useMemo(
    () => Math.max(1, ...dailySeries.map((d) => d.count)),
    [dailySeries]
  );

  const last30DaysTotal = useMemo(
    () => dailySeries.reduce((sum, d) => sum + d.count, 0),
    [dailySeries]
  );

  if (!isOpen) return null;

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const originHost = origin.replace(/^https?:\/\//, "");
  const shareUrl = shareToken ? `${origin}/share/${shareToken}` : "";
  const customSlugUrl = savedSlug ? `${origin}/r/${savedSlug}` : "";

  const emitUpdatedSharing = (overrides: Partial<ISharing>) => {
    const next: ISharing = {
      isPublic,
      shareToken,
      slug: savedSlug,
      viewCount: stats.viewCount,
      lastViewedAt: stats.lastViewedAt,
      dailyViews: stats.dailyViews,
      privacy,
      ...overrides,
    };
    onSharingUpdated?.(next);
  };

  const handleToggleSharing = async () => {
    const newPublicState = !isPublic;
    setLoading(true);
    try {
      const updated = await resumeService.updateShareSettings(resumeId, {
        isPublic: newPublicState,
        privacy,
        privacySettings: privacy,
      });
      const nextIsPublic = updated?.isPublic ?? newPublicState;
      const nextToken = updated?.shareToken ?? null;
      const nextPrivacy = resolvePrivacy(updated || { privacy });
      const nextSlug =
        updated?.slug !== undefined ? updated.slug : savedSlug;
      setIsPublic(nextIsPublic);
      setShareToken(nextToken);
      if (nextSlug !== undefined) {
        setSavedSlug(nextSlug ?? null);
      }
      setPrivacy(nextPrivacy);
      emitUpdatedSharing({
        ...(updated || {}),
        isPublic: nextIsPublic,
        shareToken: nextToken,
        slug: nextSlug ?? null,
        privacy: nextPrivacy,
      });
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
      emitUpdatedSharing(updated);
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

    try {
      const updated = await resumeService.updateShareSettings(resumeId, {
        isPublic,
        privacy: updatedPrivacy,
        privacySettings: updatedPrivacy,
      });
      emitUpdatedSharing(updated || { privacy: updatedPrivacy });
      toast.success("Privacy settings updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update privacy settings");
      setPrivacy(privacy);
    }
  };

  const handleCopyTokenLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopiedToken(false), 2500);
    } catch {
      toast.error("Failed to copy link automatically");
    }
  };

  const handleCopyCustomSlugLink = async () => {
    if (!customSlugUrl) return;
    try {
      await navigator.clipboard.writeText(customSlugUrl);
      setCopiedSlug(true);
      toast.success("Custom URL copied to clipboard!");
      setTimeout(() => setCopiedSlug(false), 2500);
    } catch {
      toast.error("Failed to copy custom URL");
    }
  };

  const handleSaveCustomSlug = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typeof resumeService.updateShareSlug !== "function") return;

    const trimmed = draftSlug.trim();
    const targetSlug = trimmed === "" ? null : trimmed;

    if (targetSlug !== null) {
      const check = validateSlugClient(targetSlug);
      if (!check.valid) {
        setSlugStatus("invalid");
        setSlugMessage(check.reason || "Invalid custom URL.");
        return;
      }
    }

    setSavingSlug(true);
    try {
      const updated = await resumeService.updateShareSlug(resumeId, targetSlug);
      const resolvedSlug =
        updated && "slug" in updated ? updated.slug ?? null : targetSlug;
      setSavedSlug(resolvedSlug);
      setDraftSlug(resolvedSlug ?? "");
      setSlugStatus(resolvedSlug ? "current" : "idle");
      setSlugMessage(
        resolvedSlug
          ? "Active custom URL for this resume."
          : "Custom URL removed."
      );
      emitUpdatedSharing({
        ...(updated || {}),
        slug: resolvedSlug,
      });
      toast.success(
        resolvedSlug ? "Custom URL saved!" : "Custom URL cleared."
      );
    } catch (err: any) {
      const msg =
        err?.message || "This custom URL slug is already taken.";
      setSlugStatus("unavailable");
      setSlugMessage(msg);
      toast.error(msg);
    } finally {
      setSavingSlug(false);
    }
  };

  const handleClearSlug = async () => {
    if (!savedSlug || typeof resumeService.updateShareSlug !== "function") {
      setDraftSlug("");
      return;
    }
    setSavingSlug(true);
    try {
      const updated = await resumeService.updateShareSlug(resumeId, null);
      setSavedSlug(null);
      setDraftSlug("");
      setSlugStatus("idle");
      setSlugMessage("3–40 lowercase letters, numbers, or hyphens.");
      emitUpdatedSharing({
        ...(updated || {}),
        slug: null,
      });
      toast.success("Custom URL removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove custom URL");
    } finally {
      setSavingSlug(false);
    }
  };

  const trimmedDraft = draftSlug.trim();
  const isSlugChanged = trimmedDraft !== (savedSlug ?? "");
  const canSaveSlug =
    !savingSlug &&
    isSlugChanged &&
    (trimmedDraft === ""
      ? Boolean(savedSlug)
      : slugStatus === "available" || slugStatus === "error");

  const activeDay =
    activeDayIndex !== null ? dailySeries[activeDayIndex] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="bg-white border border-neutral-200/90 text-neutral-900 rounded-panel shadow-modal max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-neutral-200/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <LinkIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3
                id="share-modal-title"
                className="text-base sm:text-lg font-semibold text-neutral-900 truncate"
              >
                Share "{resumeTitle}"
              </h3>
              <p className="text-xs text-neutral-500 truncate">
                Manage public link access, custom URL, privacy, and viewer analytics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus-ring"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Public Link Access Toggle */}
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-neutral-50 rounded-card border border-neutral-200/90">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-neutral-900">
                Public Link Access
              </h4>
              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                {isPublic
                  ? "Anyone with your share link or custom URL can view this resume in read-only mode."
                  : "Only you can view this resume. Public links are currently disabled."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSharing}
              disabled={loading}
              aria-label="Toggle public link access"
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-ring disabled:opacity-60 ${
                isPublic ? "bg-primary-600" : "bg-neutral-300"
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

          {/* Share Link & Actions */}
          {isPublic && shareToken ? (
            <div>
              <label
                htmlFor="share-link-input"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                Shareable Link
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  data-testid="share-link-input"
                  className="min-w-0 flex-1 h-9 bg-neutral-50 border border-neutral-300 rounded-control px-3 text-xs sm:text-sm text-neutral-800 font-mono select-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyTokenLink}
                    data-testid="copy-share-link"
                    className={`inline-flex items-center justify-center h-9 px-3 rounded-control text-xs sm:text-sm font-medium transition-colors focus-ring ${
                      copiedToken
                        ? "bg-emerald-600 text-white"
                        : "bg-primary-600 hover:bg-primary-700 text-white"
                    }`}
                  >
                    {copiedToken ? (
                      <>
                        <ClipboardDocumentCheckIcon
                          className="h-4 w-4 mr-1.5"
                          aria-hidden="true"
                        />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon
                          className="h-4 w-4 mr-1.5"
                          aria-hidden="true"
                        />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={loading}
                    title="Revoke and generate a new token"
                    aria-label="Regenerate share link"
                    data-testid="regenerate-share-link"
                    className="inline-flex items-center justify-center h-9 w-9 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-control text-neutral-600 hover:text-neutral-900 transition-colors focus-ring disabled:opacity-50"
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : !isPublic ? (
            <div className="text-center py-4 px-4 bg-neutral-50 rounded-card border border-dashed border-neutral-300">
              <p className="text-xs sm:text-sm text-neutral-700 font-medium">
                Public sharing is currently turned off
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Toggle "Public Link Access" on to activate your share link and custom URL.
              </p>
            </div>
          ) : null}

          {/* Custom URL Editor (/r/:slug) */}
          <form
            onSubmit={handleSaveCustomSlug}
            className="border-t border-neutral-200/80 pt-4 space-y-2.5"
            noValidate
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GlobeAltIcon
                  className="h-4 w-4 text-accent-600 shrink-0"
                  aria-hidden="true"
                />
                <label
                  htmlFor="custom-slug-input"
                  className="text-sm font-semibold text-neutral-900 truncate"
                >
                  Custom Public URL
                </label>
              </div>
              {savedSlug && !isPublic && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 shrink-0">
                  Inactive while private
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center flex-1 min-w-0 rounded-control border border-neutral-300 bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 overflow-hidden">
                <span
                  className="px-2.5 py-2 bg-neutral-100 border-r border-neutral-200 text-xs text-neutral-500 font-mono select-none truncate max-w-[130px] sm:max-w-[180px]"
                  title={`${origin}/r/`}
                >
                  {originHost ? `${originHost}/r/` : "/r/"}
                </span>
                <input
                  id="custom-slug-input"
                  type="text"
                  value={draftSlug}
                  onChange={(e) =>
                    setDraftSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  placeholder="your-name"
                  maxLength={SLUG_MAX_LENGTH}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="custom-slug-feedback"
                  data-testid="custom-slug-input"
                  className="min-w-0 flex-1 h-9 px-2.5 text-xs sm:text-sm font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={!canSaveSlug}
                  data-testid="save-custom-slug"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center h-9 px-3.5 rounded-control text-xs sm:text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white transition-colors focus-ring disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {savingSlug ? "Saving..." : "Save URL"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyCustomSlugLink}
                  disabled={!savedSlug}
                  data-testid="copy-custom-slug-link"
                  title={
                    savedSlug
                      ? `Copy ${customSlugUrl}`
                      : "Save a custom URL first to copy"
                  }
                  className={`inline-flex items-center justify-center h-9 px-3 rounded-control text-xs sm:text-sm font-medium border transition-colors focus-ring disabled:opacity-45 disabled:cursor-not-allowed ${
                    copiedSlug
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-700"
                  }`}
                >
                  {copiedSlug ? (
                    <>
                      <ClipboardDocumentCheckIcon
                        className="h-4 w-4 mr-1"
                        aria-hidden="true"
                      />
                      Copied
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon
                        className="h-4 w-4 mr-1"
                        aria-hidden="true"
                      />
                      Copy
                    </>
                  )}
                </button>

                {savedSlug && (
                  <button
                    type="button"
                    onClick={handleClearSlug}
                    disabled={savingSlug}
                    data-testid="clear-custom-slug"
                    className="inline-flex items-center justify-center h-9 px-2.5 rounded-control text-xs font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 border border-neutral-200 transition-colors focus-ring"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Live Availability Status Feedback */}
            <div
              id="custom-slug-feedback"
              aria-live="polite"
              className="flex items-center justify-between gap-2 text-xs min-h-[1.25rem]"
            >
              {slugStatus === "checking" && (
                <span
                  data-testid="slug-status-checking"
                  className="inline-flex items-center gap-1.5 text-neutral-600"
                >
                  <ArrowPathIcon
                    className="h-3.5 w-3.5 animate-spin text-primary-600"
                    aria-hidden="true"
                  />
                  {slugMessage}
                </span>
              )}

              {slugStatus === "available" && (
                <span
                  data-testid="slug-status-available"
                  className="inline-flex items-center gap-1.5 text-emerald-700 font-medium"
                >
                  <CheckCircleIcon
                    className="h-4 w-4 text-emerald-600 shrink-0"
                    aria-hidden="true"
                  />
                  {slugMessage}
                </span>
              )}

              {slugStatus === "current" && savedSlug && (
                <span
                  data-testid="slug-status-current"
                  className="inline-flex items-center gap-1.5 text-primary-700 font-medium truncate"
                >
                  <CheckCircleIcon
                    className="h-4 w-4 text-primary-600 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{customSlugUrl}</span>
                </span>
              )}

              {(slugStatus === "unavailable" ||
                slugStatus === "invalid" ||
                slugStatus === "error") && (
                <span
                  data-testid="slug-status-unavailable"
                  className="inline-flex items-center gap-1.5 text-red-600 font-medium"
                >
                  <ExclamationCircleIcon
                    className="h-4 w-4 text-red-600 shrink-0"
                    aria-hidden="true"
                  />
                  {slugMessage}
                </span>
              )}

              {slugStatus === "idle" && (
                <span className="text-neutral-500">{slugMessage}</span>
              )}
            </div>
          </form>

          {/* Viewer Analytics (Total Views, Last Viewed, 30-Day Bar Chart) */}
          <div
            className="border-t border-neutral-200/80 pt-4 space-y-3"
            data-testid="share-analytics-section"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ChartBarIcon
                  className="h-4 w-4 text-primary-600 shrink-0"
                  aria-hidden="true"
                />
                <h4 className="text-sm font-semibold text-neutral-900">
                  Viewer Analytics
                </h4>
              </div>
              <span className="text-[11px] text-neutral-500">
                Excludes owner &amp; bots
              </span>
            </div>

            {statsLoading ? (
              <div
                data-testid="share-stats-loading"
                role="status"
                aria-label="Loading view statistics"
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <Skeleton className="h-16 rounded-card" />
                  <Skeleton className="h-16 rounded-card" />
                </div>
                <Skeleton className="h-28 rounded-card" />
              </div>
            ) : statsError ? (
              <div
                data-testid="share-stats-error"
                role="alert"
                className="flex items-center justify-between gap-3 p-3.5 rounded-card border border-red-200 bg-red-50 text-xs text-red-700"
              >
                <span>{statsError}</span>
                <button
                  type="button"
                  onClick={fetchStats}
                  className="px-2.5 py-1 rounded-control bg-white border border-red-200 font-medium text-red-700 hover:bg-red-100 transition-colors focus-ring shrink-0"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="p-3 bg-neutral-50 rounded-card border border-neutral-200/90">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Total Views</span>
                    </div>
                    <p
                      data-testid="share-total-views"
                      className="mt-1 text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums"
                    >
                      {stats.viewCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-card border border-neutral-200/90">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Last Viewed</span>
                    </div>
                    <p
                      data-testid="share-last-viewed"
                      className="mt-1 text-sm sm:text-base font-semibold text-neutral-900 truncate"
                    >
                      {formatLastViewed(stats.lastViewedAt)}
                    </p>
                  </div>
                </div>

                {/* 30-Day Bar Chart (Plain divs + SVG, zero chart libs) */}
                <div className="p-3.5 bg-neutral-50 rounded-card border border-neutral-200/90 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-neutral-700">
                      Last 30 Days
                    </span>
                    <span
                      data-testid="share-chart-readout"
                      className="text-neutral-600 font-mono text-[11px] truncate"
                    >
                      {activeDay
                        ? `${formatBucketDateLabel(activeDay.date)}: ${
                            activeDay.count
                          } ${activeDay.count === 1 ? "view" : "views"}`
                        : `${last30DaysTotal} ${
                            last30DaysTotal === 1 ? "view" : "views"
                          } in 30d`}
                    </span>
                  </div>

                  <div
                    data-testid="share-daily-views-chart"
                    role="group"
                    aria-label="Daily views over the last 30 days"
                    className="relative h-20 flex items-end gap-[2px] pt-2 border-b border-neutral-200"
                    onMouseLeave={() => setActiveDayIndex(null)}
                  >
                    {dailySeries.map((bucket, idx) => {
                      const heightPct =
                        bucket.count > 0
                          ? Math.max(
                              14,
                              Math.round((bucket.count / maxDailyCount) * 100)
                            )
                          : 5;
                      const isActive = activeDayIndex === idx;
                      const label = `${formatBucketDateLabel(bucket.date)}: ${
                        bucket.count
                      } ${bucket.count === 1 ? "view" : "views"}`;

                      return (
                        <button
                          key={bucket.date}
                          type="button"
                          aria-label={label}
                          title={label}
                          data-testid="daily-view-bar"
                          data-count={bucket.count}
                          data-date={bucket.date}
                          onMouseEnter={() => setActiveDayIndex(idx)}
                          onFocus={() => setActiveDayIndex(idx)}
                          onBlur={() => setActiveDayIndex(null)}
                          className="group flex-1 min-w-0 h-full flex items-end justify-center focus:outline-none"
                        >
                          <span
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t-[2px] transition-all duration-150 ${
                              bucket.count > 0
                                ? isActive
                                  ? "bg-accent-600 ring-1 ring-accent-700"
                                  : "bg-primary-500 group-hover:bg-primary-600"
                                : isActive
                                ? "bg-neutral-400"
                                : "bg-neutral-200/90 group-hover:bg-neutral-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>
                      {dailySeries[0]
                        ? formatBucketDateLabel(dailySeries[0].date)
                        : "30d ago"}
                    </span>
                    <span>Today</span>
                  </div>

                  {stats.viewCount === 0 && last30DaysTotal === 0 && (
                    <p
                      data-testid="share-stats-empty"
                      className="text-[11px] text-neutral-500 text-center pt-0.5"
                    >
                      No external views yet — share your public link to see daily activity.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Privacy Controls */}
          <div className="border-t border-neutral-200/80 pt-4">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheckIcon
                className="h-4 w-4 text-accent-600 shrink-0"
                aria-hidden="true"
              />
              <h4 className="text-sm font-semibold text-neutral-900">
                Contact Field Privacy Controls
              </h4>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Hidden contact fields are redacted from public API payloads before leaving the server.
            </p>

            <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-card border border-neutral-200/90">
              {/* Hide Email */}
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="hide-email-toggle"
                  className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                >
                  <EyeSlashIcon
                    className="h-4 w-4 text-neutral-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm text-neutral-800 font-medium block">
                      Hide Email Address
                    </span>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {privacy.hideEmail
                        ? "Email is hidden from public viewers"
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
                  className="h-4 w-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Hide Phone */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-neutral-200/80">
                <label
                  htmlFor="hide-phone-toggle"
                  className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                >
                  <EyeSlashIcon
                    className="h-4 w-4 text-neutral-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm text-neutral-800 font-medium block">
                      Hide Phone Number
                    </span>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {privacy.hidePhone
                        ? "Phone number is hidden from public viewers"
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
                  className="h-4 w-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Hide Address */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-neutral-200/80">
                <label
                  htmlFor="hide-address-toggle"
                  className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                >
                  <EyeSlashIcon
                    className="h-4 w-4 text-neutral-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm text-neutral-800 font-medium block">
                      Hide Physical Address
                    </span>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {privacy.hideAddress
                        ? "Street address & postal code are hidden; city & region stay visible"
                        : "Hides street address & postal code while keeping city & region visible"}
                    </p>
                  </div>
                </label>
                <input
                  id="hide-address-toggle"
                  type="checkbox"
                  checked={privacy.hideAddress}
                  onChange={() => handleTogglePrivacy("hideAddress")}
                  data-testid="hide-address-toggle"
                  className="h-4 w-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-neutral-50 border-t border-neutral-200/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 bg-neutral-800 hover:bg-neutral-900 text-white rounded-control text-sm font-medium transition-colors focus-ring"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
