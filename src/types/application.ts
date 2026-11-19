export const APPLICATION_STATUSES = [
  'wishlist',
  'applied',
  'interview',
  'offer',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface IApplicationContact {
  name: string;
  email: string;
  role: string;
}

export interface IJobApplication {
  id: string;
  _id?: string;
  userId?: string;
  company: string;
  role: string;
  location?: string;
  url?: string;
  status: ApplicationStatus;
  order: number;
  appliedAt?: string | null;
  salary?: string;
  notes?: string;
  resumeId?: string | null;
  coverLetterId?: string | null;
  jobDescription?: string;
  contacts: IApplicationContact[];
  nextActionAt?: string | null;
  nextActionNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationReorderMove {
  id: string;
  status: ApplicationStatus;
  order: number;
}

export interface UpsertApplicationPayload {
  company: string;
  role: string;
  location?: string;
  url?: string;
  status?: ApplicationStatus;
  order?: number;
  appliedAt?: string | null;
  salary?: string;
  notes?: string;
  resumeId?: string | null;
  coverLetterId?: string | null;
  jobDescription?: string;
  contacts?: IApplicationContact[];
  nextActionAt?: string | null;
  nextActionNote?: string;
}

export interface ApplicationColumnMeta {
  id: ApplicationStatus;
  label: string;
  emptyHint: string;
  dotClass: string;
  countBadgeClass: string;
  headerBorderClass: string;
}

export const APPLICATION_COLUMNS: ReadonlyArray<ApplicationColumnMeta> = [
  {
    id: 'wishlist',
    label: 'Wishlist',
    emptyHint: 'Save target roles you want to apply for',
    dotClass: 'bg-neutral-400',
    countBadgeClass: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
    headerBorderClass: 'border-t-neutral-400',
  },
  {
    id: 'applied',
    label: 'Applied',
    emptyHint: 'Drop roles here once submitted',
    dotClass: 'bg-primary-500',
    countBadgeClass: 'bg-primary-50 text-primary-700 ring-primary-200/80',
    headerBorderClass: 'border-t-primary-500',
  },
  {
    id: 'interview',
    label: 'Interview',
    emptyHint: 'Track recruiter screens and technical rounds',
    dotClass: 'bg-accent-500',
    countBadgeClass: 'bg-accent-50 text-accent-700 ring-accent-200/80',
    headerBorderClass: 'border-t-accent-500',
  },
  {
    id: 'offer',
    label: 'Offer',
    emptyHint: 'Celebrate and compare incoming offers',
    dotClass: 'bg-emerald-500',
    countBadgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
    headerBorderClass: 'border-t-emerald-500',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    emptyHint: 'Closed applications kept for history',
    dotClass: 'bg-rose-400',
    countBadgeClass: 'bg-rose-50 text-rose-700 ring-rose-200/80',
    headerBorderClass: 'border-t-rose-400',
  },
];
