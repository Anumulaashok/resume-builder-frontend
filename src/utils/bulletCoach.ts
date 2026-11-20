import { IResume } from "../types/resume";

export type BulletCoachAction = "rewrite" | "shorten" | "improve";

export type XyzPromptLabel =
  | "Reduced latency"
  | "Increased throughput"
  | "Cut cost";

export interface XyzImpactPrompt {
  id: string;
  label: XyzPromptLabel;
  placeholder: string;
  clausePrefix: string;
}

export const XYZ_IMPACT_PROMPTS: XyzImpactPrompt[] = [
  {
    id: "reduced-latency",
    label: "Reduced latency",
    placeholder: "e.g. 35% or 120ms",
    clausePrefix: "reducing latency by",
  },
  {
    id: "increased-throughput",
    label: "Increased throughput",
    placeholder: "e.g. 3x or 100K+ req/s",
    clausePrefix: "increasing throughput by",
  },
  {
    id: "cut-cost",
    label: "Cut cost",
    placeholder: "e.g. 25% or $12K/mo",
    clausePrefix: "cutting cost by",
  },
];

export interface BulletAnalysis {
  hasMetrics: boolean;
  wordCount: number;
  charCount: number;
  isConcise: boolean;
  hasWeakLead: boolean;
}

export interface BulletCoachLocalInput {
  text: string;
  action: BulletCoachAction;
  sectionType?: string;
  fieldKey?: string;
  itemContext?: Record<string, any>;
  resume?: Partial<IResume> | null;
  userMetric?: {
    category?: string;
    value?: string;
  };
}

export interface BulletCoachResult {
  originalText: string;
  rewrittenText: string;
  action: BulletCoachAction;
  source_fact_ids: string[];
  hasMetrics: boolean;
  xyzPrompts: XyzImpactPrompt[];
}

const METRIC_CURRENCY_REGEX = /[$€£₹]\s*\d+/;
const METRIC_TOKEN_REGEX =
  /(?:^|[\s($€£₹~≈<>+-])(\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|x|×|\+|k|m|b|ms|s|sec|mins?|hrs?|hours?|days?|weeks?|months?|yrs?|years?))?)(?=$|[\s.,;:!?)\]])/gi;
const CALENDAR_YEAR_ONLY_REGEX = /^(?:19[7-9]\d|20[0-3]\d)$/;
const WEAK_LEAD_REGEX =
  /^\s*(?:[-•*]|\d+\.)?\s*(?:i\s+|we\s+)?(?:was\s+responsible\s+for|responsible\s+for|worked\s+on|helped|participated\s+in|assisted\s+(?:with|in)|made|did|handled)\b/i;

/**
 * O(n) single-pass check (< 1ms on resume-length text) detecting real numerical metrics
 * while ignoring digits attached to technology identifiers (HTML5, CSS3, ES6, k8s)
 * and standalone 4-digit calendar years.
 */
export function hasQuantifiedMetrics(text: string): boolean {
  if (typeof text !== "string" || !text.trim()) return false;
  if (METRIC_CURRENCY_REGEX.test(text)) return true;

  METRIC_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = METRIC_TOKEN_REGEX.exec(text)) !== null) {
    const token = match[1].trim();
    if (CALENDAR_YEAR_ONLY_REGEX.test(token)) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * Fast client-side X-Y-Z metric and conciseness detector (< 16ms budget).
 */
export function analyzeBulletText(text: string): BulletAnalysis {
  const safe = typeof text === "string" ? text : "";
  const trimmed = safe.trim();
  if (!trimmed) {
    return {
      hasMetrics: false,
      wordCount: 0,
      charCount: 0,
      isConcise: true,
      hasWeakLead: false,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  return {
    hasMetrics: hasQuantifiedMetrics(trimmed),
    wordCount: words.length,
    charCount: trimmed.length,
    isConcise: words.length <= 28,
    hasWeakLead: WEAK_LEAD_REGEX.test(trimmed),
  };
}

/**
 * Inserts the exact user-provided metric value under the selected X-Y-Z impact prompt
 * without altering or fabricating numbers.
 */
export function insertUserMetricIntoBullet(
  currentText: string,
  category: XyzPromptLabel | string,
  rawMetricValue: string
): { updatedText: string; sourceFactId: string } | null {
  const metric = typeof rawMetricValue === "string" ? rawMetricValue.trim() : "";
  if (!metric || !/\d/.test(metric)) {
    return null;
  }

  const promptDef =
    XYZ_IMPACT_PROMPTS.find(
      (p) => p.label.toLowerCase() === String(category || "").trim().toLowerCase()
    ) || XYZ_IMPACT_PROMPTS[0];

  const metricPhrase = /^(?:by|to|from)\b/i.test(metric)
    ? `${promptDef.clausePrefix.replace(/\s+by$/, "")} ${metric}`
    : `${promptDef.clausePrefix} ${metric}`;

  const trimmedBase = (currentText || "").trim();
  if (!trimmedBase) {
    const capitalized =
      metricPhrase.charAt(0).toUpperCase() + metricPhrase.slice(1);
    return {
      updatedText: `${capitalized}.`,
      sourceFactId: "fact:user:metric",
    };
  }

  if (trimmedBase.includes(metric)) {
    return {
      updatedText: trimmedBase,
      sourceFactId: "fact:user:metric",
    };
  }

  const withoutTrailingPeriod = trimmedBase.replace(/[.]+$/, "");
  return {
    updatedText: `${withoutTrailingPeriod}, ${metricPhrase}.`,
    sourceFactId: "fact:user:metric",
  };
}

const WEAK_VERB_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^(?:i\s+)?(?:was\s+)?responsible\s+for\s+working\s+on\b/i, "Engineered"],
  [/^(?:i\s+)?(?:was\s+)?responsible\s+for\s+building\b/i, "Architected"],
  [/^(?:i\s+)?(?:was\s+)?responsible\s+for\s+managing\b/i, "Directed"],
  [/^(?:i\s+)?(?:was\s+)?responsible\s+for\b/i, "Owned"],
  [/^(?:i\s+)?worked\s+on\b/i, "Engineered"],
  [/^(?:i\s+)?helped\s+(?:to\s+)?build\b/i, "Co-developed"],
  [/^(?:i\s+)?helped\s+(?:with|in|on)\b/i, "Contributed to"],
  [/^(?:i\s+)?helped\b/i, "Supported"],
  [/^(?:i\s+)?participated\s+in\b/i, "Collaborated on"],
  [/^(?:i\s+)?assisted\s+(?:with|in)\b/i, "Delivered"],
  [/^(?:i\s+)?made\b/i, "Developed"],
  [/^(?:i\s+)?did\b/i, "Executed"],
  [/^(?:i\s+)?handled\b/i, "Managed"],
  [/^(?:i\s+)?fixed\b/i, "Resolved"],
  [/^(?:i\s+)?used\b/i, "Leveraged"],
];

const FILLER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bin order to\b/gi, "to"],
  [/\bas well as\b/gi, "and"],
  [/\ba wide variety of\b/gi, ""],
  [/\ba variety of\b/gi, ""],
  [/\bon a daily basis\b/gi, ""],
  [/\bplayed a key role in\b/gi, "led"],
  [/\bwas able to\b/gi, ""],
  [/\bsuccessfully\s+/gi, ""],
  [/\bvarious\s+/gi, ""],
  [/\beffectively\s+/gi, ""],
  [/\bactively\s+/gi, ""],
];

const slugifyToken = (val: string): string =>
  val
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "item";

function collectLocalFactIds(input: BulletCoachLocalInput, rewrittenText: string): string[] {
  const ids = new Set<string>(["fact:bullet:input"]);
  const loweredOutput = rewrittenText.toLowerCase();

  if (input.userMetric?.value && /\d/.test(input.userMetric.value)) {
    ids.add("fact:user:metric");
  }

  const ctx = input.itemContext;
  if (ctx && typeof ctx === "object") {
    const key =
      typeof ctx.id === "string" && ctx.id.trim()
        ? slugifyToken(ctx.id.trim())
        : "active";
    const entity = (ctx.company || ctx.name || "").toString().trim();
    const role = (ctx.position || "").toString().trim();
    const degree = (ctx.degree || "").toString().trim();
    const school = (ctx.field || ctx.institution || "").toString().trim();
    if (entity) ids.add(`fact:context:${key}:entity`);
    if (role) ids.add(`fact:context:${key}:role`);
    if (degree) ids.add(`fact:context:${key}:degree`);
    if (school) ids.add(`fact:context:${key}:institution`);
  }

  const sections = input.resume?.content?.sections || [];
  for (const sec of sections) {
    if (!sec || !Array.isArray(sec.content)) continue;
    for (const item of sec.content as Array<Record<string, any>>) {
      if (!item || typeof item !== "object") continue;
      const skillName = (item.name || "").toString().trim();
      if (
        skillName &&
        String(sec.type || "").toLowerCase().includes("skill") &&
        loweredOutput.includes(skillName.toLowerCase())
      ) {
        ids.add(`fact:skill:${slugifyToken(skillName)}`);
      }
    }
  }

  return Array.from(ids);
}

function transformLine(rawLine: string, action: BulletCoachAction): string {
  const prefixMatch = rawLine.match(/^(\s*(?:[-•*]|\d+\.)\s+)/);
  const prefix = prefixMatch ? prefixMatch[1] : "";
  let body = rawLine.slice(prefix.length).trim();
  if (!body) return rawLine;

  body = body.replace(/^(?:i|we)\s+/i, "");

  if (action === "shorten") {
    for (const [pattern, replacement] of FILLER_REPLACEMENTS) {
      body = body.replace(pattern, replacement);
    }
    for (const [pattern, replacement] of WEAK_VERB_REPLACEMENTS) {
      body = body.replace(pattern, replacement);
    }
    body = body.replace(/\s{2,}/g, " ").trim();
    const clauses = body.split(/,\s+(?:while|which|allowing|enabling|supporting)\s+/i);
    if (clauses.length > 1 && !hasQuantifiedMetrics(clauses[clauses.length - 1])) {
      body = clauses.slice(0, -1).join(", ");
    }
    body = body.replace(/[.]+$/, "").trim();
    body = body.charAt(0).toUpperCase() + body.slice(1);
    return `${prefix}${body}.`;
  }

  let verbUpgraded = false;
  for (const [pattern, replacement] of WEAK_VERB_REPLACEMENTS) {
    if (pattern.test(body)) {
      body = body.replace(pattern, replacement);
      verbUpgraded = true;
      break;
    }
  }

  for (const [pattern, replacement] of FILLER_REPLACEMENTS) {
    body = body.replace(pattern, replacement);
  }
  body = body.replace(/\s{2,}/g, " ").trim();
  const cleanNoPeriod = body.replace(/[.]+$/, "").trim();

  if (action === "improve") {
    let improved = cleanNoPeriod.charAt(0).toUpperCase() + cleanNoPeriod.slice(1);
    const wordCount = improved.split(/\s+/).filter(Boolean).length;
    if (
      wordCount <= 9 &&
      !/\b(?:improving|reducing|increasing|enhancing|delivering|supporting)\b/i.test(
        improved
      )
    ) {
      improved = `${improved} to support reliable production workflows`;
    }
    return `${prefix}${improved}.`;
  }

  let rewritten = cleanNoPeriod.charAt(0).toUpperCase() + cleanNoPeriod.slice(1);
  if (
    !verbUpgraded &&
    !/^(?:Delivered|Engineered|Architected|Spearheaded|Built|Optimized)\b/i.test(
      rewritten
    )
  ) {
    if (
      /^(?:developing|building|creating|designing|maintaining|implementing)\b/i.test(
        rewritten
      )
    ) {
      rewritten = rewritten
        .replace(/^developing\b/i, "Developed")
        .replace(/^building\b/i, "Built")
        .replace(/^creating\b/i, "Created")
        .replace(/^designing\b/i, "Designed")
        .replace(/^maintaining\b/i, "Maintained")
        .replace(/^implementing\b/i, "Implemented");
    } else {
      const lowered = rewritten.charAt(0).toLowerCase() + rewritten.slice(1);
      rewritten = `Delivered ${lowered}`;
    }
  }
  return `${prefix}${rewritten}.`;
}

export function coachBulletLocally(input: BulletCoachLocalInput): BulletCoachResult {
  const originalText = input.text || "";
  const lines = originalText.trim().split("\n");
  const transformed = lines.map((line) =>
    line.trim() ? transformLine(line, input.action) : line
  );

  let rewrittenText = transformed.join("\n").trim();
  if (input.userMetric?.value && /\d/.test(input.userMetric.value)) {
    const applied = insertUserMetricIntoBullet(
      rewrittenText,
      input.userMetric.category || "Reduced latency",
      input.userMetric.value
    );
    if (applied) {
      rewrittenText = applied.updatedText;
    }
  }

  return {
    originalText,
    rewrittenText,
    action: input.action,
    source_fact_ids: collectLocalFactIds(input, rewrittenText),
    hasMetrics: hasQuantifiedMetrics(rewrittenText),
    xyzPrompts: XYZ_IMPACT_PROMPTS,
  };
}
