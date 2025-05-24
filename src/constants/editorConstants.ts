import { IResume } from "../types/resume";

export const defaultResume: IResume = {
    title: "Untitled Resume",
    content: {
      basics: {
        name: "",
        label: "",
        email: "",
        phone: "",
        summary: "",
        location: {
          address: "",
          city: "",
          countryCode: "",
          postalCode: "",
        },
      },
      sections: [],
      sectionOrder: [],
    },
  };