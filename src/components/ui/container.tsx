import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "main" | "section";
}

export const Container: React.FC<ContainerProps> = ({
  as: Component = "div",
  className = "",
  children,
  ...props
}) => {
  return (
    <Component className={`page-container ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
};
