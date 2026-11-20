import { IResume } from "../types/resume";

export const defaultResume: IResume = {
    title: "Untitled Resume",
    content: {
      basics: {
        name: "",
        label: "",
        email: "",
        phone: "",
        url: "",
        linkedin: "",
        github: "",
        summary: "",
        location: {
          address: "",
          city: "",
          region: "",
          countryCode: "",
          postalCode: "",
        },
        profiles: [],
      },
      sections: [],
      sectionOrder: [],
    },
  };