import React from 'react';

export const convertMarkdownToHTML = (markdown: string) => {
  if (!markdown) return '';
  
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
    .replace(/\n- (.*?)(?=\n|\r|\r\n|$)/g, '<ul><li>$1</li></ul>')
    .replace(/\n1\. (.*?)(?=\n|\r|\r\n|$)/g, '<ol><li>$1</li></ol>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
};

export const DescriptionPreview = ({ description }: { description: string }) => {
  return (
    <div className="description-preview">
      <p
        className="text-xs text-gray-500 whitespace-pre-line"
        dangerouslySetInnerHTML={{
          __html: convertMarkdownToHTML(description),
        }}
      />
    </div>
  );
};
