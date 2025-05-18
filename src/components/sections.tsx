import { ISection, SectionType } from "../types/resume";

interface SectionEditorProps {
  section: Partial<ISection> | null;
  setAddSection: (section: null) => void;
}

const SectionEditors: React.FC<SectionEditorProps> = ({
  section,
  setAddSection,
}) => {
  if (!section) {
    return null;
  }
  
  if (section.type === SectionType.SKILLS) {
    return (
      <DialogBox title="Skills" onClose={() => setAddSection(null)}>
        <div>Skills</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.WORK) {
    return (
      <DialogBox title="Work" onClose={() => setAddSection(null)}>
        <div>Work</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.EDUCATION) {
    return (
      <DialogBox title="Education" onClose={() => setAddSection(null)}>
        <div>Education</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.LANGUAGES) {
    return (
      <DialogBox title="Languages" onClose={() => setAddSection(null)}>
        <div>Languages</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.CERTIFICATES) {
    return (
      <DialogBox title="Certificates" onClose={() => setAddSection(null)}>
        <div>Certificates</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.INTERESTS) {
    return (
      <DialogBox title="Interests" onClose={() => setAddSection(null)}>
        <div>Interests</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.PROJECTS) {
    return (
      <DialogBox title="Projects" onClose={() => setAddSection(null)}>
        <div>Projects</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.COURSES) {
    return (
      <DialogBox title="Courses" onClose={() => setAddSection(null)}>
        <div>Courses</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.AWARDS) {
    return (
      <DialogBox title="Awards" onClose={() => setAddSection(null)}>
        <div>Awards</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.ORGANIZATIONS) {
    return (
      <DialogBox title="Organizations" onClose={() => setAddSection(null)}>
        <div>Organizations</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.PUBLICATIONS) {
    return (
      <DialogBox title="Publications" onClose={() => setAddSection(null)}>
        <div>Publications</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.REFERENCES) {
    return (
      <DialogBox title="References" onClose={() => setAddSection(null)}>
        <div>References</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.SOFTSKILSS) {
    return (
      <DialogBox title="Soft Skills" onClose={() => setAddSection(null)}>
        <div>Soft Skills</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.ACHIVEMENTS) {
    return (
      <DialogBox title="Achievements" onClose={() => setAddSection(null)}>
        <div>Achievements</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.TECK_SKILLS) {
    return (
      <DialogBox title="Technical Skills" onClose={() => setAddSection(null)}>
        <div>Technical Skills</div>
      </DialogBox>
    );
  } else if (section.type === SectionType.CUSTOM) {
    return (
      <DialogBox title="Custom" onClose={() => setAddSection(null)}>
        <div>Custom</div>
      </DialogBox>
    );
  } else {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <p>Unknown section type: {section.type}</p>
      </div>
    );
  }
};

const DialogBox: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md m-auto">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
        <button
          onClick={onClose}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SectionEditors;
