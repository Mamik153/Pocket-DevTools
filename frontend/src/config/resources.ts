export interface ResourceLink {
  name: string;
  href: string;
}

export interface ResourceSection {
  title: "UI Components" | "AI Frameworks" | "Online Compilers" | "Reading Material";
  links: ResourceLink[];
}

export const resourceSections: ResourceSection[] = [
  {
    title: "UI Components",
    links: [
      { name: "shadcn/ui", href: "https://ui.shadcn.com/" },
      { name: "Radix UI", href: "https://www.radix-ui.com/" },
      { name: "MUI", href: "https://mui.com/" },
      { name: "Chakra UI", href: "https://chakra-ui.com/" },
    ],
  },
  {
    title: "AI Frameworks",
    links: [
      { name: "LangChain", href: "https://www.langchain.com/" },
      { name: "LlamaIndex", href: "https://www.llamaindex.ai/" },
      { name: "Haystack", href: "https://haystack.deepset.ai/" },
      { name: "Vercel AI SDK", href: "https://sdk.vercel.ai/" },
    ],
  },
  {
    title: "Online Compilers",
    links: [
      { name: "Replit", href: "https://replit.com/" },
      { name: "StackBlitz", href: "https://stackblitz.com/" },
      { name: "CodeSandbox", href: "https://codesandbox.io/" },
      { name: "JDoodle", href: "https://www.jdoodle.com/" },
    ],
  },
  {
    title: "Reading Material",
    links: [
      { name: "MDN Web Docs", href: "https://developer.mozilla.org/" },
      { name: "freeCodeCamp", href: "https://www.freecodecamp.org/" },
      { name: "Refactoring.Guru", href: "https://refactoring.guru/" },
      { name: "System Design Primer", href: "https://github.com/donnemartin/system-design-primer" },
    ],
  },
];
