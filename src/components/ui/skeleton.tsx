import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  ...props
}) => {
  return (
    <div
      className={`animate-pulse rounded-control bg-neutral-200/80 ${className}`.trim()}
      {...props}
    />
  );
};
