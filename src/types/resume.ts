export interface ResumeSection {
  id: string;
  type: string;
  title: string;
  content: any[];
  isCustom?: boolean;
}

export interface Resume {
  id?: string;
  title: string;
  content: {
    basics: {
      name: string;
      label: string;
      email: string;
      phone: string;
      summary: string;
      location: {
        address: string;
        city: string;
        countryCode: string;
        postalCode: string;
      };
    };
    sections: ResumeSection[];
    sectionOrder: string[];
  };
}
