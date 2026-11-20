import React from 'react';

export interface PrintMarginTableProps {
  children: React.ReactNode;
  fallbackMargin?: string;
  renderTopSpacer?: boolean;
  renderBottomSpacer?: boolean;
  className?: string;
  cellClassName?: string;
}

export const PrintMarginTable: React.FC<PrintMarginTableProps> = ({
  children,
  fallbackMargin = '1.75cm',
  renderTopSpacer = true,
  renderBottomSpacer = true,
  className = '',
  cellClassName = '',
}) => {
  const marginExpr = `var(--theme-page-margin, ${fallbackMargin})`;

  return (
    <table
      role="presentation"
      data-testid="print-margin-table"
      className={`w-full table-fixed border-collapse ${className}`.trim()}
    >
      {renderTopSpacer && (
        <thead
          aria-hidden="true"
          data-testid="print-margin-spacer-top"
          className="hidden print:table-header-group"
        >
          <tr>
            <td
              className="p-0"
              style={
                {
                  height: marginExpr,
                  '--print-spacer-height': marginExpr,
                } as React.CSSProperties
              }
            />
          </tr>
        </thead>
      )}
      <tbody>
        <tr>
          <td className={`p-0 align-top w-full max-w-full ${cellClassName}`.trim()}>
            {children}
          </td>
        </tr>
      </tbody>
      {renderBottomSpacer && (
        <tfoot
          aria-hidden="true"
          data-testid="print-margin-spacer-bottom"
          className="hidden print:table-footer-group"
        >
          <tr>
            <td
              className="p-0"
              style={
                {
                  height: marginExpr,
                  '--print-spacer-height': marginExpr,
                } as React.CSSProperties
              }
            />
          </tr>
        </tfoot>
      )}
    </table>
  );
};
