import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Button } from './ui/button';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const controls = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline') },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    { icon: LinkIcon, action: () => {
      const url = window.prompt('Enter URL');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }, isActive: editor.isActive('link') },
  ];

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <div className="flex items-center p-2 border-b gap-1">
        {controls.map((control, index) => (
          <Button
            key={index}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${control.isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            onClick={control.action}
          >
            <control.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} className="p-4" />
    </div>
  );
};

export default RichTextEditor;
