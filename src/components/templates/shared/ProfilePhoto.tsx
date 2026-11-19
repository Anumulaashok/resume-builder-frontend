import React from 'react';
import { IResume, PhotoShape, PhotoSize, ThemePhotoConfig } from '../../../types/resume';
import { resolvePhotoConfig } from '../../../constants/themeConstants';
import { useTemplateContext } from './TemplateContext';

export interface ProfilePhotoProps {
  resume?: IResume;
  photoConfig?: Partial<ThemePhotoConfig>;
  atsMode?: boolean;
  className?: string;
}

const SHAPE_CLASSES: Record<PhotoShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
  square: 'rounded-none',
};

const SIZE_CLASSES: Record<PhotoSize, string> = {
  sm: 'w-14 h-14',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
};

export function shouldRenderProfilePhoto(
  resume?: IResume,
  overridePhotoConfig?: Partial<ThemePhotoConfig>,
  overrideAtsMode?: boolean
): boolean {
  if (!resume) return false;
  const isAts = overrideAtsMode ?? Boolean(resume.themeConfig?.atsMode);
  if (isAts) return false;
  const image = resume.content?.basics?.image;
  if (!image || typeof image !== 'string' || !image.trim()) return false;
  const resolved = resolvePhotoConfig(overridePhotoConfig ?? resume.themeConfig?.photo);
  return resolved.show !== false;
}

export const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  resume: propResume,
  photoConfig: propPhotoConfig,
  atsMode: propAtsMode,
  className = '',
}) => {
  const ctx = useTemplateContext();
  const resume = propResume || ctx.resume;
  const isAts = propAtsMode ?? ctx.atsMode ?? Boolean(resume?.themeConfig?.atsMode);

  if (!shouldRenderProfilePhoto(resume, propPhotoConfig, isAts)) {
    return null;
  }

  const image = resume!.content.basics.image!;
  const name = resume?.content?.basics?.name?.trim() || 'Profile';
  const resolved = resolvePhotoConfig(propPhotoConfig ?? resume?.themeConfig?.photo);
  const shapeClass = SHAPE_CLASSES[resolved.shape] || SHAPE_CLASSES.circle;
  const sizeClass = SIZE_CLASSES[resolved.size] || SIZE_CLASSES.md;

  return (
    <img
      src={image}
      alt={`${name} profile`}
      data-testid="resume-profile-photo"
      data-photo-shape={resolved.shape}
      data-photo-size={resolved.size}
      className={`object-cover shrink-0 border border-slate-200/80 ${shapeClass} ${sizeClass} ${className}`}
    />
  );
};
