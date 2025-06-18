// import dynamic from 'next/dynamic';
// import 'react-quill/dist/quill.snow.css';

// const ReactQuill = dynamic(() => import('react-quill'), {
//   ssr: false,
//   loading: () => <div>Loading...</div>,
// });

// const modules = {
//   toolbar: [
//     ['bold', 'italic', 'underline'],
//     [{ list: 'ordered' }, { list: 'bullet' }],
//     ['link'],
//     ['clean']
//   ]
// };

// const formats = [
//   'bold', 'italic', 'underline',
//   'list', 'bullet', 'link'
// ];

// interface QuillEditorProps {
//   value: string;
//   onChange: (value: string) => void;
// }

// const QuillEditor = ({ value, onChange }: QuillEditorProps) => {
//   return (
//     <ReactQuill
//       theme="snow"
//       value={value}
//       onChange={onChange}
//       modules={modules}
//       formats={formats}
//       className="bg-white rounded-md"
//     />
//   );
// };

// export default QuillEditor;
