import type { IResume, ISection } from '../../types/resume';
import { getTemplateMetadata } from '../../constants/templateMetadata';
import {
  BUZZWORDS,
  STRONG_VERB_LOOKUP,
  TECH_SPELLING_RULES,
  WEAK_OPENERS,
} from './dictionaries';
import {
  bulletHasMetric,
  countWords,
  extractExperienceBullets,
  extractFirstWordToken,
  getCheckerSectionKind,
  hasHeadingSpecialCharsOrEmoji,
  isPresentToken,
  isValidEmail,
  normalizeBulletForDedup,
  ParsedResumeDate,
  parseResumeDateValue,
  resolveTrackedVerb,
  shouldAdviseAgainstPhotoForLocation,
  stripUrlsAndEmails,
} from './helpers';
import type {
  CategoryId,
  IssueSeverity,
  ResumeCheckCategory,
  ResumeCheckIssue,
  ResumeCheckResult,
  ResumeCheckThemeInput,
  ResumeGrade,
} from './types';

export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  contact: 0.15,
  summary: 0.15,
  experience: 0.3,
  skills: 0.15,
  language: 0.1,
  ats: 0.15,
};

const SEVERITY_PENALTY: Record<IssueSeverity, number> = {
  critical: 30,
  warning: 12,
  tip: 4,
};

const ZERO_SCORE_ISSUE_IDS = new Set([
  'summary-missing',
  'experience-missing',
  'skills-missing',
]);

export function computeCategoryScore(issues: ResumeCheckIssue[]): number {
  for (let i = 0; i < issues.length; i += 1) {
    if (ZERO_SCORE_ISSUE_IDS.has(issues[i].id)) {
      return 0;
    }
  }
  let deduction = 0;
  for (let i = 0; i < issues.length; i += 1) {
    deduction += SEVERITY_PENALTY[issues[i].severity] || 0;
  }
  return Math.max(0, Math.min(100, 100 - deduction));
}

export function scoreToGrade(score: number): ResumeGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getEnabledOrderedSections(resume: IResume): ISection[] {
  const sections = Array.isArray(resume?.content?.sections)
    ? resume.content.sections
    : [];
  const order = Array.isArray(resume?.content?.sectionOrder)
    ? resume.content.sectionOrder
    : [];
  if (sections.length === 0) return [];

  const seen = new Set<string>();
  const ordered: ISection[] = [];

  for (let i = 0; i < order.length; i += 1) {
    const id = order[i];
    const sec = sections.find((s) => s && s.id === id);
    if (sec && sec.enabled !== false && !seen.has(sec.id)) {
      seen.add(sec.id);
      ordered.push(sec);
    }
  }

  for (let i = 0; i < sections.length; i += 1) {
    const sec = sections[i];
    if (sec && sec.enabled !== false && !seen.has(sec.id)) {
      seen.add(sec.id);
      ordered.push(sec);
    }
  }

  return ordered;
}

function checkContact(resume: IResume): ResumeCheckCategory {
  const issues: ResumeCheckIssue[] = [];
  const basics: Record<string, any> = resume?.content?.basics || {};

  const name = typeof basics.name === 'string' ? basics.name.trim() : '';
  if (!name) {
    issues.push({
      id: 'contact-missing-name',
      severity: 'critical',
      message: 'Full name is missing from your contact header.',
      sectionId: 'basics',
      fix: 'Enter your full name in Basic Information so recruiters and ATS parsers can identify your profile.',
    });
  }

  const email = typeof basics.email === 'string' ? basics.email.trim() : '';
  if (!email) {
    issues.push({
      id: 'contact-missing-email',
      severity: 'critical',
      message: 'Email address is missing.',
      sectionId: 'basics',
      fix: 'Add a professional email address (e.g. firstname.lastname@domain.com) in Basic Information.',
    });
  } else if (!isValidEmail(email)) {
    issues.push({
      id: 'contact-invalid-email',
      severity: 'critical',
      message: `"${email}" is not a valid email address.`,
      sectionId: 'basics',
      fix: 'Use a valid email format such as jane.doe@example.com without spaces.',
    });
  }

  const phone = typeof basics.phone === 'string' ? basics.phone.trim() : '';
  const phoneDigits = phone.replace(/\D/g, '');
  if (!phone) {
    issues.push({
      id: 'contact-missing-phone',
      severity: 'warning',
      message: 'Phone number is missing.',
      sectionId: 'basics',
      fix: 'Include a reachable phone number with area or country code (e.g. +1 555-234-5678).',
    });
  } else if (phoneDigits.length < 7) {
    issues.push({
      id: 'contact-invalid-phone',
      severity: 'warning',
      message: 'Phone number looks incomplete (fewer than 7 digits).',
      sectionId: 'basics',
      fix: 'Provide a full phone number including area code.',
    });
  }

  const loc = basics.location;
  const hasLocation =
    typeof loc === 'string'
      ? loc.trim().length > 0
      : Boolean(
          loc &&
            typeof loc === 'object' &&
            [
              loc.city,
              loc.region,
              loc.state,
              loc.countryCode,
              loc.country,
              loc.address,
              loc.postalCode,
            ].some((v) => typeof v === 'string' && v.trim().length > 0)
        );

  if (!hasLocation) {
    issues.push({
      id: 'contact-missing-location',
      severity: 'warning',
      message: 'Location (city / country) is missing.',
      sectionId: 'basics',
      fix: 'Add your city and state/country (e.g. "San Francisco, US") — full street address is unnecessary.',
    });
  }

  const hasDirectLink = [
    basics.url,
    basics.website,
    basics.portfolioUrl,
    basics.linkedin,
    basics.github,
  ].some((v) => typeof v === 'string' && v.trim().length > 0);

  const hasProfileLink =
    Array.isArray(basics.profiles) &&
    basics.profiles.some(
      (p: any) => p && typeof p.url === 'string' && p.url.trim().length > 0
    );

  if (!hasDirectLink && !hasProfileLink) {
    issues.push({
      id: 'contact-missing-link',
      severity: 'warning',
      message: 'No LinkedIn, GitHub, or portfolio website link included.',
      sectionId: 'basics',
      fix: 'Add at least one professional profile or portfolio URL in Basic Information.',
    });
  }

  return {
    id: 'contact',
    label: 'Contact',
    weight: CATEGORY_WEIGHTS.contact,
    score: computeCategoryScore(issues),
    issues,
  };
}

function checkSummary(resume: IResume): ResumeCheckCategory {
  const issues: ResumeCheckIssue[] = [];
  const basicsSummary = resume?.content?.basics?.summary;
  const rawSummary =
    typeof basicsSummary === 'string' && basicsSummary.trim().length > 0
      ? basicsSummary
      : typeof resume?.summary === 'string'
      ? resume.summary
      : '';
  const summary = rawSummary.trim();

  if (!summary) {
    issues.push({
      id: 'summary-missing',
      severity: 'critical',
      message: 'Professional summary is missing.',
      sectionId: 'basics',
      fix: 'Write a 30–120 word summary highlighting your role, years of experience, core strengths, and measurable impact.',
    });
    return {
      id: 'summary',
      label: 'Summary',
      weight: CATEGORY_WEIGHTS.summary,
      score: 0,
      issues,
    };
  }

  const wordCount = countWords(summary);
  if (wordCount < 30) {
    issues.push({
      id: 'summary-too-short',
      severity: 'warning',
      message: `Summary is too brief (${wordCount} words; aim for 30–120 words).`,
      sectionId: 'basics',
      fix: 'Expand your summary to 2–4 concise sentences (30–120 words) covering scope, domain strengths, and key outcomes.',
    });
  } else if (wordCount > 120) {
    issues.push({
      id: 'summary-too-long',
      severity: 'warning',
      message: `Summary is too long (${wordCount} words; aim for 30–120 words).`,
      sectionId: 'basics',
      fix: 'Trim your summary under 120 words so recruiters can scan your core value proposition in seconds.',
    });
  }

  const firstPersonMatches =
    summary.match(
      /\b(?:I|I['’]m|I['’]ve|I['’]d|I['’]ll|me|my|myself)\b/gi
    ) || [];
  // Filter out lowercase roman numeral "i." if followed by period
  const firstPersonCount = firstPersonMatches.length;

  if (firstPersonCount >= 2) {
    issues.push({
      id: 'summary-first-person',
      severity: 'warning',
      message: `Summary overuses first-person pronouns (${firstPersonCount} uses of "I"/"me"/"my").`,
      sectionId: 'basics',
      fix: 'Rewrite in implied first-person (e.g. "Senior engineer with 7+ years building..." instead of "I am a senior engineer and I built...").',
    });
  } else if (firstPersonCount === 1) {
    issues.push({
      id: 'summary-first-person-tip',
      severity: 'tip',
      message: 'Summary contains a first-person pronoun ("I"/"me"/"my").',
      sectionId: 'basics',
      fix: 'Drop first-person pronouns for a tighter, executive resume tone.',
    });
  }

  return {
    id: 'summary',
    label: 'Summary',
    weight: CATEGORY_WEIGHTS.summary,
    score: computeCategoryScore(issues),
    issues,
  };
}

interface DatedRoleRecord {
  sectionId: string;
  itemId: string;
  label: string;
  start: ParsedResumeDate;
  end: ParsedResumeDate;
  isCurrent: boolean;
}

function isDateInFuture(parsed: ParsedResumeDate, now: Date): boolean {
  if (parsed.isPresent) return false;
  const nowYear = now.getFullYear();
  const nowMonthIndex = nowYear * 12 + now.getMonth();
  if (!parsed.hasExplicitMonth) {
    return parsed.year > nowYear;
  }
  return parsed.monthIndex > nowMonthIndex;
}

function checkExperience(
  sections: ISection[],
  now: Date
): ResumeCheckCategory {
  const issues: ResumeCheckIssue[] = [];
  const workSections = sections.filter(
    (sec) => getCheckerSectionKind(sec) === 'work'
  );
  const primaryWorkSectionId = workSections[0]?.id;

  const workEntries: Array<{ section: ISection; item: Record<string, any> }> = [];
  workSections.forEach((sec) => {
    const items = Array.isArray(sec.content) ? sec.content : [];
    items.forEach((item: any) => {
      if (item && item.enabled !== false) {
        workEntries.push({ section: sec, item });
      }
    });
  });

  if (workEntries.length === 0) {
    issues.push({
      id: 'experience-missing',
      severity: 'critical',
      message: 'No work experience entries found.',
      sectionId: primaryWorkSectionId,
      fix: 'Add a Professional Experience section with your relevant roles and quantified achievements.',
    });
    return {
      id: 'experience',
      label: 'Experience',
      weight: CATEGORY_WEIGHTS.experience,
      score: 0,
      issues,
    };
  }

  let totalBullets = 0;
  let metricBullets = 0;
  const seenBullets = new Map<string, { sectionId: string; itemId: string }>();
  const datedRoles: DatedRoleRecord[] = [];
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();

  workSections.forEach((sec) => {
    const enabledItems = (Array.isArray(sec.content) ? sec.content : []).filter(
      (it: any) => it && it.enabled !== false
    ) as Array<Record<string, any>>;

    const sectionOrderDates: Array<{
      itemId: string;
      label: string;
      primarySort: number;
      secondarySort: number;
    }> = [];

    enabledItems.forEach((item) => {
      const itemId = String(item.id || '');
      const company = String(item.company || item.name || '').trim();
      const role = String(item.position || item.role || '').trim();
      const roleLabel =
        role && company
          ? `${role} at ${company}`
          : role || company || 'Experience entry';

      if (!role) {
        issues.push({
          id: `experience-missing-role-${itemId}`,
          severity: 'critical',
          message: `${company || 'Experience entry'} is missing a job title / role.`,
          sectionId: sec.id,
          itemId,
          fix: 'Specify your exact title (e.g. "Senior Backend Engineer") so ATS role matchers classify your seniority.',
        });
      }

      if (!company) {
        issues.push({
          id: `experience-missing-company-${itemId}`,
          severity: 'critical',
          message: `${role || 'Experience entry'} is missing a company name.`,
          sectionId: sec.id,
          itemId,
          fix: 'Enter the employer or organization name.',
        });
      }

      const rawStart = item.startDate;
      const hasRawStart =
        typeof rawStart === 'string'
          ? rawStart.trim().length > 0
          : Boolean(
              rawStart &&
                typeof rawStart === 'object' &&
                (rawStart.year || rawStart.month)
            );
      const parsedStart = parseResumeDateValue(rawStart, 1, now);

      if (!hasRawStart) {
        issues.push({
          id: `experience-missing-start-date-${itemId}`,
          severity: 'critical',
          message: `${roleLabel} is missing a start date.`,
          sectionId: sec.id,
          itemId,
          fix: 'Add a start month and year such as "Jan 2022" or "01/2022".',
        });
      } else if (!parsedStart) {
        issues.push({
          id: `experience-invalid-start-date-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} has an unrecognizable start date format.`,
          sectionId: sec.id,
          itemId,
          fix: 'Use a standard ATS-friendly date format such as "Mar 2022" or "03/2022".',
        });
      }

      const isCurrent = Boolean(
        item.current || item.isCurrent || isPresentToken(item.endDate)
      );
      const rawEnd = item.endDate;
      const hasRawEnd =
        typeof rawEnd === 'string'
          ? rawEnd.trim().length > 0
          : Boolean(
              rawEnd &&
                typeof rawEnd === 'object' &&
                (rawEnd.year || rawEnd.month)
            );
      const parsedEnd = isCurrent
        ? {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            hasExplicitMonth: true,
            isPresent: true,
            monthIndex: currentMonthIndex,
          }
        : parseResumeDateValue(rawEnd, 12, now);

      if (!isCurrent && !hasRawEnd) {
        issues.push({
          id: `experience-missing-end-date-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} is missing an end date (and is not marked current).`,
          sectionId: sec.id,
          itemId,
          fix: 'Add an end date (e.g. "Dec 2023") or check "Currently working here".',
        });
      } else if (!isCurrent && hasRawEnd && !parsedEnd) {
        issues.push({
          id: `experience-invalid-end-date-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} has an unrecognizable end date format.`,
          sectionId: sec.id,
          itemId,
          fix: 'Use a standard date format such as "Nov 2024", "11/2024", or "Present".',
        });
      }

      const startInFuture = parsedStart ? isDateInFuture(parsedStart, now) : false;
      const endInFuture =
        !isCurrent && parsedEnd ? isDateInFuture(parsedEnd, now) : false;

      if (startInFuture || endInFuture) {
        issues.push({
          id: `experience-future-date-${itemId}`,
          severity: 'critical',
          message: `${roleLabel} has a date set in the future.`,
          sectionId: sec.id,
          itemId,
          fix: 'Correct future dates or mark ongoing roles as "Present".',
        });
      }

      if (
        parsedStart &&
        parsedEnd &&
        !isCurrent &&
        parsedEnd.monthIndex < parsedStart.monthIndex
      ) {
        issues.push({
          id: `experience-end-before-start-${itemId}`,
          severity: 'critical',
          message: `${roleLabel} has an end date earlier than its start date.`,
          sectionId: sec.id,
          itemId,
          fix: 'Verify that the start date precedes the end date.',
        });
      }

      if (parsedStart && parsedEnd && parsedEnd.monthIndex >= parsedStart.monthIndex) {
        const primarySort = isCurrent
          ? currentMonthIndex + 12
          : parsedEnd.monthIndex;
        sectionOrderDates.push({
          itemId,
          label: roleLabel,
          primarySort,
          secondarySort: parsedStart.monthIndex,
        });
        datedRoles.push({
          sectionId: sec.id,
          itemId,
          label: roleLabel,
          start: parsedStart,
          end: parsedEnd,
          isCurrent,
        });
      }

      // Bullet checks
      const bullets = extractExperienceBullets(item);
      if (bullets.length === 0) {
        issues.push({
          id: `experience-no-bullets-${itemId}`,
          severity: 'critical',
          message: `${roleLabel} has no achievement bullets.`,
          sectionId: sec.id,
          itemId,
          fix: 'Add 2–6 concise bullet points starting with strong action verbs and quantified outcomes.',
        });
      } else if (bullets.length < 2) {
        issues.push({
          id: `experience-too-few-bullets-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} only has 1 bullet point (aim for 2–6 bullets).`,
          sectionId: sec.id,
          itemId,
          fix: 'Add at least one more bullet highlighting technical scope, ownership, or measurable results.',
        });
      } else if (bullets.length > 6) {
        issues.push({
          id: `experience-too-many-bullets-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} has ${bullets.length} bullets (aim for 2–6 per role).`,
          sectionId: sec.id,
          itemId,
          fix: 'Consolidate or remove lower-impact bullets so your strongest 4–6 achievements stand out.',
        });
      }

      let matchedWeakRule: { phrase: string; suggestion: string } | null = null;
      const nonActionVerbOpeners: string[] = [];
      let shortBulletWords: number | null = null;
      let longBulletWords: number | null = null;
      let duplicateBulletSample: string | null = null;

      bullets.forEach((bullet) => {
        totalBullets += 1;
        if (bulletHasMetric(bullet)) {
          metricBullets += 1;
        }

        const lowerBullet = bullet.toLowerCase();
        let isWeakOpener = false;
        for (let w = 0; w < WEAK_OPENERS.length; w += 1) {
          const rule = WEAK_OPENERS[w];
          const escaped = rule.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`^${escaped}\\b`, 'i').test(lowerBullet)) {
            isWeakOpener = true;
            if (!matchedWeakRule) {
              matchedWeakRule = rule;
            }
            break;
          }
        }

        const firstWord = extractFirstWordToken(bullet);
        if (!isWeakOpener) {
          if (!firstWord || !STRONG_VERB_LOOKUP.has(firstWord)) {
            nonActionVerbOpeners.push(firstWord || bullet.slice(0, 18));
          }
        }

        const words = countWords(bullet);
        if (words < 8 && shortBulletWords === null) {
          shortBulletWords = words;
        } else if (words > 35 && longBulletWords === null) {
          longBulletWords = words;
        }

        const dedupKey = normalizeBulletForDedup(bullet);
        if (dedupKey.length >= 12) {
          if (seenBullets.has(dedupKey) && duplicateBulletSample === null) {
            duplicateBulletSample =
              bullet.length > 55 ? `${bullet.slice(0, 52)}...` : bullet;
          } else {
            seenBullets.set(dedupKey, { sectionId: sec.id, itemId });
          }
        }
      });

      if (matchedWeakRule) {
        const foundRule = matchedWeakRule as { phrase: string; suggestion: string };
        issues.push({
          id: `experience-weak-opener-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} uses a weak bullet opener ("${foundRule.phrase}").`,
          sectionId: sec.id,
          itemId,
          fix: foundRule.suggestion,
        });
      }

      if (nonActionVerbOpeners.length > 0) {
        issues.push({
          id: `experience-action-verb-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} has ${
            nonActionVerbOpeners.length === 1
              ? 'a bullet not starting'
              : `${nonActionVerbOpeners.length} bullets not starting`
          } with a strong action verb.`,
          sectionId: sec.id,
          itemId,
          fix: 'Lead each bullet with a decisive past-tense verb such as "Architected", "Spearheaded", "Reduced", or "Delivered".',
        });
      }

      if (shortBulletWords !== null) {
        issues.push({
          id: `experience-bullet-short-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} has a bullet that is too short (${shortBulletWords} words; aim for 8–35 words).`,
          sectionId: sec.id,
          itemId,
          fix: 'Expand short fragments using the XYZ formula: Accomplished [X] as measured by [Y], by doing [Z].',
        });
      }

      if (longBulletWords !== null) {
        issues.push({
          id: `experience-bullet-long-${itemId}`,
          severity: 'warning',
          message: `${roleLabel} has a bullet that is too long (${longBulletWords} words; aim for 8–35 words).`,
          sectionId: sec.id,
          itemId,
          fix: 'Split multi-sentence bullets into 2 crisp bullets of 8–35 words each.',
        });
      }

      if (duplicateBulletSample !== null) {
        issues.push({
          id: `experience-duplicate-bullet-${itemId}`,
          severity: 'warning',
          message: `Duplicate bullet detected in ${roleLabel}: "${duplicateBulletSample}".`,
          sectionId: sec.id,
          itemId,
          fix: 'Rewrite repeated bullets to highlight distinct responsibilities and outcomes for each role.',
        });
      }
    });

    // Reverse-chronological order within section
    for (let i = 0; i < sectionOrderDates.length - 1; i += 1) {
      const curr = sectionOrderDates[i];
      const next = sectionOrderDates[i + 1];
      const outOfOrder =
        next.primarySort > curr.primarySort ||
        (next.primarySort === curr.primarySort &&
          next.secondarySort > curr.secondarySort);
      if (outOfOrder) {
        issues.push({
          id: `experience-chronology-order-${sec.id}`,
          severity: 'warning',
          message: `Experience dates are not in reverse-chronological order ("${next.label}" is more recent than "${curr.label}").`,
          sectionId: sec.id,
          itemId: next.itemId,
          fix: 'List your current or most recent role first, followed by earlier positions in descending date order.',
        });
        break;
      }
    }
  });

  // >=40% of bullets contain a number/metric
  if (totalBullets > 0) {
    const ratio = metricBullets / totalBullets;
    if (ratio < 0.4) {
      const pct = Math.round(ratio * 100);
      issues.push({
        id: 'experience-low-metrics',
        severity: 'warning',
        message: `Only ${pct}% of experience bullets include numbers or metrics (aim for at least 40%).`,
        sectionId: primaryWorkSectionId,
        fix: 'Quantify your impact with percentages, latency/cost reductions, team size, throughput, or revenue figures.',
      });
    }
  }

  // Chronological overlaps and >6 month gaps
  if (datedRoles.length >= 2) {
    const chronological = datedRoles
      .slice()
      .sort((a, b) =>
        a.start.monthIndex !== b.start.monthIndex
          ? a.start.monthIndex - b.start.monthIndex
          : a.end.monthIndex - b.end.monthIndex
      );

    let maxEndRole = chronological[0];
    let reportedOverlap = false;

    for (let i = 1; i < chronological.length; i += 1) {
      const curr = chronological[i];
      const prevEnd = maxEndRole.end.monthIndex;

      // Avoid false overlap when both boundaries are year-only in the same calendar year (e.g. 2020-2022 then 2022-2024)
      const sameYearOnlyHandoff =
        !maxEndRole.isCurrent &&
        !maxEndRole.end.hasExplicitMonth &&
        !curr.start.hasExplicitMonth &&
        maxEndRole.end.year === curr.start.year;

      if (!reportedOverlap && !sameYearOnlyHandoff && curr.start.monthIndex < prevEnd) {
        reportedOverlap = true;
        issues.push({
          id: `experience-overlapping-dates-${curr.itemId}`,
          severity: 'warning',
          message: `Overlapping employment dates between "${maxEndRole.label}" and "${curr.label}".`,
          sectionId: curr.sectionId,
          itemId: curr.itemId,
          fix: 'Clarify exact start/end months or note if one position was part-time, advisory, or concurrent.',
        });
      } else if (curr.start.monthIndex - prevEnd > 6) {
        const gapMonths = curr.start.monthIndex - prevEnd;
        issues.push({
          id: `experience-gap-${curr.itemId}`,
          severity: 'tip',
          message: `Employment gap of ~${gapMonths} months between "${maxEndRole.label}" and "${curr.label}".`,
          sectionId: curr.sectionId,
          itemId: curr.itemId,
          fix: 'Consider briefly accounting for gaps > 6 months (e.g. freelance consulting, sabbatical, caregiving, or coursework) if relevant.',
        });
      }

      if (curr.end.monthIndex > maxEndRole.end.monthIndex) {
        maxEndRole = curr;
      }
    }
  }

  return {
    id: 'experience',
    label: 'Experience',
    weight: CATEGORY_WEIGHTS.experience,
    score: computeCategoryScore(issues),
    issues,
  };
}

function extractSkillEntriesFromItem(item: Record<string, any>): {
  skills: string[];
  isGroupedOrCommaList: boolean;
} {
  const rawSub =
    item.subSkills ??
    item.technologies ??
    item.keywords ??
    item.items ??
    item.skills;

  const subList: string[] = [];
  if (Array.isArray(rawSub)) {
    rawSub.forEach((entry: unknown) => {
      if (typeof entry === 'string' && entry.trim()) {
        subList.push(entry.trim());
      } else if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as any).name === 'string' &&
        (entry as any).name.trim()
      ) {
        subList.push((entry as any).name.trim());
      }
    });
  } else if (typeof rawSub === 'string' && rawSub.trim()) {
    rawSub
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => subList.push(s));
  }

  if (subList.length > 0) {
    return { skills: subList, isGroupedOrCommaList: true };
  }

  const rawName = String(item.name || item.title || '').trim();
  if (!rawName) {
    return { skills: [], isGroupedOrCommaList: false };
  }

  if (rawName.indexOf(',') !== -1) {
    const parts = rawName
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      skills: parts,
      isGroupedOrCommaList: parts.length > 1,
    };
  }

  return { skills: [rawName], isGroupedOrCommaList: false };
}

function checkSkills(sections: ISection[]): ResumeCheckCategory {
  const issues: ResumeCheckIssue[] = [];
  const skillSections = sections.filter(
    (sec) => getCheckerSectionKind(sec) === 'skills'
  );
  const primarySectionId = skillSections[0]?.id;

  const allSkillOccurrences: Array<{
    name: string;
    sectionId: string;
    itemId: string;
  }> = [];
  const nonEmptyItems: Array<{
    sectionId: string;
    itemId: string;
    count: number;
    isGroupedOrCommaList: boolean;
  }> = [];

  skillSections.forEach((sec) => {
    const items = Array.isArray(sec.content) ? sec.content : [];
    items.forEach((item: any) => {
      if (!item || item.enabled === false) return;
      const itemId = String(item.id || '');
      const extracted = extractSkillEntriesFromItem(item);
      if (extracted.skills.length > 0) {
        nonEmptyItems.push({
          sectionId: sec.id,
          itemId,
          count: extracted.skills.length,
          isGroupedOrCommaList: extracted.isGroupedOrCommaList,
        });
        extracted.skills.forEach((skillName) => {
          allSkillOccurrences.push({
            name: skillName,
            sectionId: sec.id,
            itemId,
          });
        });
      }
    });
  });

  const totalSkills = allSkillOccurrences.length;

  if (totalSkills === 0) {
    issues.push({
      id: 'skills-missing',
      severity: 'critical',
      message: 'No skills listed on your resume.',
      sectionId: primarySectionId,
      fix: 'Add a Skills section with 5–30 relevant technical and domain skills grouped by category.',
    });
    return {
      id: 'skills',
      label: 'Skills',
      weight: CATEGORY_WEIGHTS.skills,
      score: 0,
      issues,
    };
  }

  if (totalSkills < 5) {
    issues.push({
      id: 'skills-too-few',
      severity: 'warning',
      message: `Only ${totalSkills} skill${totalSkills === 1 ? '' : 's'} listed (aim for 5–30 skills).`,
      sectionId: primarySectionId,
      fix: 'Include at least 5 core tools, languages, or methodologies that match target job descriptions.',
    });
  } else if (totalSkills > 30) {
    issues.push({
      id: 'skills-too-many',
      severity: 'warning',
      message: `${totalSkills} skills listed (aim for 5–30 curated skills).`,
      sectionId: primarySectionId,
      fix: 'Prune outdated or generic tools so recruiters focus on your strongest 10–25 skills.',
    });
  }

  // Case-insensitive duplicates
  const seenSkills = new Map<string, string>();
  const duplicates: string[] = [];
  let duplicateTarget: { sectionId: string; itemId: string } | null = null;

  allSkillOccurrences.forEach((occ) => {
    const key = occ.name.toLowerCase();
    if (seenSkills.has(key)) {
      if (duplicates.map((d) => d.toLowerCase()).indexOf(key) === -1) {
        duplicates.push(occ.name);
      }
      if (!duplicateTarget) {
        duplicateTarget = { sectionId: occ.sectionId, itemId: occ.itemId };
      }
    } else {
      seenSkills.set(key, occ.name);
    }
  });

  if (duplicates.length > 0) {
    const dupLoc = duplicateTarget as { sectionId: string; itemId: string } | null;
    issues.push({
      id: 'skills-duplicates',
      severity: 'warning',
      message: `Duplicate skill${duplicates.length > 1 ? 's' : ''} found: ${duplicates.join(', ')}.`,
      sectionId: dupLoc?.sectionId || primarySectionId,
      itemId: dupLoc?.itemId,
      fix: 'Remove repeated skills (including case variations) to keep your skills section scannable.',
    });
  }

  // Not all in one giant group
  const singleGiantGroupItem =
    totalSkills >= 5 && nonEmptyItems.length === 1 ? nonEmptyItems[0] : null;
  const ungroupedFlatGiantList =
    skillSections.length === 1 &&
    nonEmptyItems.length >= 10 &&
    nonEmptyItems.every((it) => !it.isGroupedOrCommaList);

  if (singleGiantGroupItem || ungroupedFlatGiantList) {
    issues.push({
      id: 'skills-single-group',
      severity: 'warning',
      message: 'All skills are placed in a single giant group.',
      sectionId: singleGiantGroupItem?.sectionId || primarySectionId,
      itemId: singleGiantGroupItem?.itemId,
      fix: 'Organize skills into 2–4 clear categories (e.g. "Languages", "Frameworks", "Cloud & Tooling") for faster scanning.',
    });
  }

  return {
    id: 'skills',
    label: 'Skills',
    weight: CATEGORY_WEIGHTS.skills,
    score: computeCategoryScore(issues),
    issues,
  };
}

interface TextSegment {
  text: string;
  sectionId?: string;
  itemId?: string;
  isProse: boolean;
}

const INFLECTED_VERB_SUFFIX = /(?:ed|ing)$/i;
const IRREGULAR_PAST_VERBS = new Set([
  'built',
  'rebuilt',
  'led',
  'drove',
  'driven',
  'wrote',
  'written',
  'grew',
  'grown',
  'oversaw',
  'overseen',
  'won',
  'ran',
  'made',
  'troubleshot',
]);

function collectLanguageSegments(
  resume: IResume,
  sections: ISection[]
): TextSegment[] {
  const segments: TextSegment[] = [];
  const basics = resume?.content?.basics || {};
  const summary = basics.summary || resume?.summary || '';
  if (typeof summary === 'string' && summary.trim()) {
    segments.push({
      text: summary,
      sectionId: 'basics',
      isProse: true,
    });
  }
  if (typeof basics.label === 'string' && basics.label.trim()) {
    segments.push({
      text: basics.label,
      sectionId: 'basics',
      isProse: false,
    });
  }

  sections.forEach((sec) => {
    const items = Array.isArray(sec.content) ? sec.content : [];
    items.forEach((item: any) => {
      if (!item || item.enabled === false) return;
      const itemId = String(item.id || '');

      if (typeof item.description === 'string' && item.description.trim()) {
        segments.push({
          text: item.description,
          sectionId: sec.id,
          itemId,
          isProse: true,
        });
      }

      if (Array.isArray(item.highlights)) {
        item.highlights.forEach((h: unknown) => {
          if (typeof h === 'string' && h.trim()) {
            segments.push({
              text: h,
              sectionId: sec.id,
              itemId,
              isProse: true,
            });
          }
        });
      }

      ['name', 'title', 'position', 'subtitle'].forEach((key) => {
        if (typeof item[key] === 'string' && item[key].trim()) {
          segments.push({
            text: item[key],
            sectionId: sec.id,
            itemId,
            isProse: false,
          });
        }
      });

      ['subSkills', 'technologies', 'keywords'].forEach((arrKey) => {
        if (Array.isArray(item[arrKey])) {
          const joined = item[arrKey]
            .filter((v: unknown) => typeof v === 'string')
            .join(', ');
          if (joined) {
            segments.push({
              text: joined,
              sectionId: sec.id,
              itemId,
              isProse: false,
            });
          }
        }
      });
    });
  });

  return segments;
}

function checkLanguage(
  resume: IResume,
  sections: ISection[]
): ResumeCheckCategory {
  const issues: ResumeCheckIssue[] = [];
  const segments = collectLanguageSegments(resume, sections);

  // 1. Repeated non-stopword verbs (>3 times across prose)
  const verbCounts = new Map<
    string,
    {
      count: number;
      alternatives: string[];
      sectionId?: string;
      itemId?: string;
    }
  >();

  segments.forEach((seg) => {
    if (!seg.isProse) return;
    const cleanedText = stripUrlsAndEmails(seg.text);
    const lines = cleanedText.split(/\r?\n/);

    lines.forEach((line) => {
      // Split into clauses so base verbs at bullet/clause/infinitive starts are caught,
      // while avoiding mid-clause noun homographs like "design system"
      const clauses = line.split(/(?:[.!?;—–]|\band\b|\bto\b)/i);
      clauses.forEach((clause) => {
        const tokens = clause
          .trim()
          .replace(/^(?:[•●▪◦‣⁃\-*]+|\d+[.)])\s*/, '')
          .split(/\s+/)
          .map((t) => t.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
          .filter(Boolean);

        tokens.forEach((tok, idx) => {
          const lower = tok.toLowerCase();
          const tracked = resolveTrackedVerb(lower);
          if (!tracked) return;

          const isVerbPositionOrInflection =
            idx === 0 ||
            INFLECTED_VERB_SUFFIX.test(lower) ||
            IRREGULAR_PAST_VERBS.has(lower);

          if (!isVerbPositionOrInflection) return;

          const existing = verbCounts.get(tracked.base);
          if (existing) {
            existing.count += 1;
          } else {
            verbCounts.set(tracked.base, {
              count: 1,
              alternatives: tracked.alternatives,
              sectionId: seg.sectionId,
              itemId: seg.itemId,
            });
          }
        });
      });
    });
  });

  verbCounts.forEach((info, baseVerb) => {
    if (info.count > 3) {
      const altText =
        info.alternatives.length > 0
          ? ` Try varying with: ${info.alternatives.slice(0, 3).join(', ')}.`
          : '';
      issues.push({
        id: `language-repeated-verb-${baseVerb}`,
        severity: 'warning',
        message: `Action verb "${baseVerb}" is repeated ${info.count} times across your resume.`,
        sectionId: info.sectionId,
        itemId: info.itemId,
        fix: `Vary repeated verbs (keep each under 4 uses) to showcase broader capabilities.${altText}`,
      });
    }
  });

  // 2. Buzzwords / clichés
  const matchedBuzzwords: string[] = [];
  let buzzwordTarget: { sectionId?: string; itemId?: string } | null = null;

  segments.forEach((seg) => {
    const cleaned = stripUrlsAndEmails(seg.text);
    for (let i = 0; i < BUZZWORDS.length; i += 1) {
      const bw = BUZZWORDS[i];
      const escaped = bw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(cleaned)) {
        if (matchedBuzzwords.indexOf(bw) === -1) {
          matchedBuzzwords.push(bw);
        }
        if (!buzzwordTarget) {
          buzzwordTarget = { sectionId: seg.sectionId, itemId: seg.itemId };
        }
      }
    }
  });

  if (matchedBuzzwords.length > 0) {
    const quoted = matchedBuzzwords.map((b) => `"${b}"`).join(', ');
    const bwLoc = buzzwordTarget as { sectionId?: string; itemId?: string } | null;
    issues.push({
      id: 'language-buzzwords',
      severity: 'warning',
      message: `Cliché buzzword${matchedBuzzwords.length > 1 ? 's' : ''} detected: ${quoted}.`,
      sectionId: bwLoc?.sectionId,
      itemId: bwLoc?.itemId,
      fix: 'Replace vague buzzwords with concrete evidence, systems built, and measurable outcomes.',
    });
  }

  // 3. Canonical spelling of common tech names
  const misspellings: Array<{ found: string; canonical: string }> = [];
  const seenCanonicals = new Set<string>();
  let spellingTarget: { sectionId?: string; itemId?: string } | null = null;

  segments.forEach((seg) => {
    const cleaned = stripUrlsAndEmails(seg.text);
    for (let r = 0; r < TECH_SPELLING_RULES.length; r += 1) {
      const rule = TECH_SPELLING_RULES[r];
      for (let v = 0; v < rule.variants.length; v += 1) {
        const variant = rule.variants[v];
        const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(
          `(?:^|[^A-Za-z0-9./_-])(${escaped})(?=$|[^A-Za-z0-9/_-])`
        );
        const match = cleaned.match(regex);
        if (match && match[1] === variant && !seenCanonicals.has(rule.canonical)) {
          seenCanonicals.add(rule.canonical);
          misspellings.push({ found: variant, canonical: rule.canonical });
          if (!spellingTarget) {
            spellingTarget = { sectionId: seg.sectionId, itemId: seg.itemId };
          }
        }
      }
    }
  });

  if (misspellings.length > 0) {
    const corrections = misspellings
      .map((m) => `${m.found} → ${m.canonical}`)
      .join(', ');
    const spLoc = spellingTarget as { sectionId?: string; itemId?: string } | null;
    issues.push({
      id: 'language-tech-spelling',
      severity: 'warning',
      message: `Non-standard technology capitalization: ${corrections}.`,
      sectionId: spLoc?.sectionId,
      itemId: spLoc?.itemId,
      fix: `Use official casing (${corrections}) for polish and exact ATS keyword matching.`,
    });
  }

  return {
    id: 'language',
    label: 'Language',
    weight: CATEGORY_WEIGHTS.language,
    score: computeCategoryScore(issues),
    issues,
  };
}

function estimatePageCountFromContent(
  resume: IResume,
  sections: ISection[]
): number {
  let words = countWords(
    resume?.content?.basics?.summary || resume?.summary || ''
  );
  let lines = summaryLineEstimate(
    resume?.content?.basics?.summary || resume?.summary || ''
  );

  sections.forEach((sec) => {
    lines += 2;
    const items = Array.isArray(sec.content) ? sec.content : [];
    items.forEach((item: any) => {
      if (!item || item.enabled === false) return;
      lines += 2;
      if (typeof item.description === 'string') {
        words += countWords(item.description);
        lines += summaryLineEstimate(item.description);
      }
      if (Array.isArray(item.highlights)) {
        item.highlights.forEach((h: unknown) => {
          if (typeof h === 'string') {
            words += countWords(h);
            lines += Math.max(1, Math.ceil(countWords(h) / 14));
          }
        });
      }
    });
  });

  const byWords = Math.ceil(words / 500);
  const byLines = Math.ceil(lines / 52);
  return Math.max(1, byWords, byLines);
}

function summaryLineEstimate(text: string): number {
  if (!text.trim()) return 0;
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let total = 0;
  rawLines.forEach((l) => {
    total += Math.max(1, Math.ceil(countWords(l) / 15));
  });
  return total;
}

function checkAtsFormatting(
  resume: IResume,
  sections: ISection[],
  theme?: ResumeCheckThemeInput
): ResumeCheckCategory {
  const issues: ResumeCheckIssue[] = [];
  const basics: Record<string, any> = resume?.content?.basics || {};

  const templateId =
    theme?.templateId || resume?.templateId || (resume as any)?.template;
  const templateMeta = getTemplateMetadata(templateId);
  const effectiveLayout = theme?.templateLayout ?? templateMeta.layout;
  const atsMode = Boolean(theme?.atsMode);

  // 1. Multi-column template without ATS mode
  if (!atsMode && effectiveLayout !== 'single') {
    issues.push({
      id: 'ats-multi-column-template',
      severity: 'warning',
      message: `Template "${templateMeta.name}" uses a ${effectiveLayout} layout, which some legacy ATS parsers read out of column order.`,
      fix: 'Switch to a single-column ATS template (e.g. Modern, Professional, Classic, Executive) or verify order via "Download ATS text".',
    });
  }

  // 2. Photo present = tip for US/UK
  const photoValue =
    basics.image || basics.photo || basics.avatar || basics.avatarUrl;
  const hasPhoto = typeof photoValue === 'string' && photoValue.trim().length > 0;
  if (hasPhoto && shouldAdviseAgainstPhotoForLocation(basics.location)) {
    issues.push({
      id: 'ats-photo-present',
      severity: 'tip',
      message: 'Profile photo included — generally discouraged on US and UK resumes.',
      sectionId: 'basics',
      fix: 'Omit headshots when applying in the US or UK to prevent ATS image-parsing quirks and unconscious-bias filtering.',
    });
  }

  // 3. Page count > 2 = warning
  const pageCount =
    typeof theme?.pageCount === 'number' && theme.pageCount > 0
      ? theme.pageCount
      : estimatePageCountFromContent(resume, sections);

  if (pageCount > 2) {
    issues.push({
      id: 'ats-page-count',
      severity: 'warning',
      message: `Resume spans ${pageCount} pages (recommended maximum is 1–2 pages).`,
      fix: 'Tighten older experience bullets, use compact spacing, or hide less-relevant sections to fit within 2 pages.',
    });
  }

  // 4. Special characters / emoji in section headings
  sections.forEach((sec) => {
    const title = typeof sec.title === 'string' ? sec.title.trim() : '';
    if (title && hasHeadingSpecialCharsOrEmoji(title)) {
      issues.push({
        id: `ats-heading-special-chars-${sec.id}`,
        severity: 'warning',
        message: `Section heading "${title}" contains emoji or special symbols.`,
        sectionId: sec.id,
        fix: 'Use plain text section headings (e.g. "Work Experience", "Skills", "Education") so ATS section classifiers recognize them.',
      });
    }
  });

  // 5. Tables & icons surfaced ONLY as tips
  let hasInlineTableMarkup = false;
  let hasInlineIconsOrEmoji = false;

  sections.forEach((sec) => {
    const items = Array.isArray(sec.content) ? sec.content : [];
    items.forEach((item: any) => {
      if (!item || item.enabled === false) return;
      const desc = typeof item.description === 'string' ? item.description : '';
      if (/<table\b|\|.+\|.+\|/i.test(desc)) {
        hasInlineTableMarkup = true;
      }
      if (/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/.test(desc)) {
        hasInlineIconsOrEmoji = true;
      }
    });
  });

  const usesTables =
    !atsMode &&
    (theme?.hasTables !== undefined
      ? Boolean(theme.hasTables)
      : Boolean(templateMeta.usesTables) || hasInlineTableMarkup);

  if (usesTables) {
    issues.push({
      id: 'ats-tables-tip',
      severity: 'tip',
      message: 'Table-based alignment detected; verify plain-text reading order for older ATS.',
      fix: 'Prefer linear single-column formatting or preview your plain-text export with "Download ATS text".',
    });
  }

  const effectiveSkillStyle =
    theme?.skillStyle ??
    resume?.themeConfig?.skillStyle ??
    templateMeta.defaultTheme.skillStyle;

  const usesIcons =
    !atsMode &&
    (theme?.hasIcons !== undefined
      ? Boolean(theme.hasIcons)
      : Boolean(templateMeta.usesIcons) ||
        effectiveSkillStyle === 'bars' ||
        effectiveSkillStyle === 'dots' ||
        hasInlineIconsOrEmoji);

  if (usesIcons) {
    issues.push({
      id: 'ats-icons-tip',
      severity: 'tip',
      message: 'Decorative icons or visual skill meters (bars/dots) are ignored by ATS text extractors.',
      fix: 'Ensure every icon or skill bar is paired with clear text labels (or use inline/chip skill styles).',
    });
  }

  return {
    id: 'ats',
    label: 'ATS formatting',
    weight: CATEGORY_WEIGHTS.ats,
    score: computeCategoryScore(issues),
    issues,
  };
}

export function checkResume(
  resume: IResume,
  theme?: ResumeCheckThemeInput
): ResumeCheckResult {
  const safeResume: IResume = resume || {
    content: { basics: {}, sections: [], sectionOrder: [] },
  };
  const now = theme?.now instanceof Date ? theme.now : new Date();
  const enabledSections = getEnabledOrderedSections(safeResume);

  const categories: ResumeCheckCategory[] = [
    checkContact(safeResume),
    checkSummary(safeResume),
    checkExperience(enabledSections, now),
    checkSkills(enabledSections),
    checkLanguage(safeResume, enabledSections),
    checkAtsFormatting(safeResume, enabledSections, theme),
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < categories.length; i += 1) {
    weightedSum += categories[i].score * categories[i].weight;
    totalWeight += categories[i].weight;
  }

  const rawOverall = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const score = Math.max(0, Math.min(100, Math.round(rawOverall)));

  return {
    score,
    grade: scoreToGrade(score),
    categories,
  };
}
