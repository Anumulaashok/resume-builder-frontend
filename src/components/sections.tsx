import { on } from "events";
import { EducationItem, ISection, SectionType } from "../types/resume";
import EducationForm from "./Education-form";

export interface ContntProps {
  type: SectionType;
  item: any;
}
interface SectionEditorProps {
  content: ContntProps;
  onClose: () => void;
  onSave: (type: SectionType, item: any) => void;
}

const SectionEditors: React.FC<SectionEditorProps> = ({
  content,
  onClose,
  onSave,
}) => {
  if (!content) {
    return null;
  }

  if (content.type === SectionType.SKILLS) {
    return (
      <DialogBox title="Skills" onClose={onClose}>
        <div>Skills</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.WORK) {
    return (
      <DialogBox title="Work" onClose={onClose}>
        <div>Work</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.EDUCATION) {
    return (
      <DialogBox title="Education">
        <EducationForm
          initialContent={content.item as EducationItem}
          onSave={(newContent) => {
            onSave(content.type, newContent);
          }}
          onCancel={() => onClose()}
        />
      </DialogBox>
    );
  } else if (content.type === SectionType.LANGUAGES) {
    return (
      <DialogBox title="Languages" onClose={onClose}>
        <div>Languages</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.CERTIFICATES) {
    return (
      <DialogBox title="Certificates" onClose={onClose}>
        <div>Certificates</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.INTERESTS) {
    return (
      <DialogBox title="Interests" onClose={onClose}>
        <div>Interests</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.PROJECTS) {
    return (
      <DialogBox title="Projects" onClose={onClose}>
        <div>Projects</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.COURSES) {
    return (
      <DialogBox title="Courses" onClose={onClose}>
        <div>Courses</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.AWARDS) {
    return (
      <DialogBox title="Awards" onClose={onClose}>
        <div>Awards</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.ORGANIZATIONS) {
    return (
      <DialogBox title="Organizations" onClose={onClose}>
        <div>Organizations</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.PUBLICATIONS) {
    return (
      <DialogBox title="Publications" onClose={onClose}>
        <div>Publications</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.REFERENCES) {
    return (
      <DialogBox title="References" onClose={onClose}>
        <div>References</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.SOFTSKILSS) {
    return (
      <DialogBox title="Soft Skills" onClose={onClose}>
        <div>Soft Skills</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.ACHIVEMENTS) {
    return (
      <DialogBox title="Achievements" onClose={onClose}>
        <div>Achievements</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.TECK_SKILLS) {
    return (
      <DialogBox title="Technical Skills" onClose={onClose}>
        <div>Technical Skills</div>
      </DialogBox>
    );
  } else if (content.type === SectionType.CUSTOM) {
    return (
      <DialogBox title="Custom" onClose={onClose}>
        <div>Custom</div>
      </DialogBox>
    );
  } else {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <p>Unknown content type: {content.type}</p>
      </div>
    );
  }
};

export const DialogBox: React.FC<{
  title?: string;
  id?: string;
  onClose?: () => void;
  children: React.ReactNode;
  onSave?: (id: string) => void;
  [key: string]: any;
}> = ({ title, onClose, children, onSave, id, ...props }) => {
  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm w-full ${
        props.className || ""
      }`}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl m-auto">
        {title && (
          <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4 ">
            {title}
          </h2>
        )}
        {children}
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        )}
        {onSave && id && (
          <button
            onClick={() => onSave(id)}
            className={`mt-4 bg-green-500 text-white px-4 py-2 rounded ml-2 ${
              props?.saveText && props.saveText === "Delete" && "bg-red-500"
            }`}
          >
            {props?.saveText ?? "Save"}
          </button>
        )}
      </div>
    </div>
  );
};

export default SectionEditors;

// const ContentEducationItem: React.FC<{ section: ISection | null }> = ({ section }) => {
//   if (!section) {
//     return null;
//   }
//   const { title, content } = section;

//   return (
//     <div className="space-y-6">
//       <h2 className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
//         {title}
//       </h2>
//       <div className="space-y-6">
//         {content.map((item, index) => {
//           const educationItem = item as EducationItem;
//           return (
//             <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
//               <div className="mb-4">
//                 <input
//                   type="text"
//                   value={educationItem.institution || ""}
//                   placeholder="Enter institution"
//                   className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   onChange={(e) => (educationItem.institution = e.target.value)}
//                 />
//               </div>
//               <div className="flex flex-wrap gap-2 items-center mb-4">
//                 <input
//                   type="text"
//                   value={educationItem.degree || ""}
//                   placeholder="Enter degree"
//                   className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   onChange={(e) => (educationItem.degree = e.target.value)}
//                 />
//                 <span className="text-gray-600 font-medium">in</span>
//                 <input
//                   type="text"
//                   value={educationItem.field || ""}
//                   placeholder="Enter field"
//                   className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   onChange={(e) => (educationItem.field = e.target.value)}
//                 />
//               </div>
//               <div>
//                 <input
//                   type="text"
//                   value={educationItem.startDate || ""}
//                   placeholder="Start date"
//                   className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   onChange={(e) => (educationItem.startDate = e.target.value)}
//                 />
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };
