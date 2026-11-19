import React from 'react';
import { ProfilePhoto, shouldRenderProfilePhoto } from './ProfilePhoto';
import { useTemplateContext } from './TemplateContext';

export interface HeaderWithPhotoProps {
  children: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const HeaderWithPhoto: React.FC<HeaderWithPhotoProps> = ({
  children,
  align = 'left',
  className = '',
}) => {
  const ctx = useTemplateContext();
  const showPhoto = shouldRenderProfilePhoto(
    ctx.resume,
    ctx.resume?.themeConfig?.photo,
    ctx.atsMode
  );

  if (!showPhoto) {
    return <>{children}</>;
  }

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className={`min-w-0 flex-1 ${align === 'center' ? 'text-center' : ''}`}>
        {children}
      </div>
      <ProfilePhoto />
    </div>
  );
};
