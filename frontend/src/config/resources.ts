export interface ResourceLink {
  name: string;
  href: string;
}

export interface ResourceSection {
  title: "UI Components" | "AI Frameworks" | "Online Compilers" | "Reading Material";
  description: string;
  links: ResourceLink[];
}

export const resourceSections: ResourceSection[] = [
  {
    title: "UI Components",
    description: "Libraries and inspiration for your next interface.",
    links: [
      { name: "shadcn/ui", href: "https://ui.shadcn.com/" },
      { name: "Radix UI", href: "https://www.radix-ui.com/" },
      { name: "MUI", href: "https://mui.com/" },
      { name: "Chakra UI", href: "https://chakra-ui.com/" },
      { name: "bencho.dev", href: "https://bencho.dev" },
      { name: "libraries.dev", href: "https://libraries.dev" },
      { name: "cuelume.dev", href: "https://cuelume.dev" },
      { name: "21st.dev", href: "https://21st.dev" },
    ],
  },
  {
    title: "AI Frameworks",
    description: "Frameworks for building with language models.",
    links: [
      { name: "LangChain", href: "https://www.langchain.com/" },
      { name: "LlamaIndex", href: "https://www.llamaindex.ai/" },
      { name: "Haystack", href: "https://haystack.deepset.ai/" },
      { name: "Vercel AI SDK", href: "https://sdk.vercel.ai/" },
    ],
  },
  {
    title: "Online Compilers",
    description: "Build, run, and share code in your browser.",
    links: [
      { name: "Replit", href: "https://replit.com/" },
      { name: "StackBlitz", href: "https://stackblitz.com/" },
      { name: "CodeSandbox", href: "https://codesandbox.io/" },
      { name: "JDoodle", href: "https://www.jdoodle.com/" },
    ],
  },
  {
    title: "Reading Material",
    description: "Documentation and guides to keep learning.",
    links: [
      { name: "MDN Web Docs", href: "https://developer.mozilla.org/" },
      { name: "freeCodeCamp", href: "https://www.freecodecamp.org/" },
      { name: "Refactoring.Guru", href: "https://refactoring.guru/" },
      { name: "System Design Primer", href: "https://github.com/donnemartin/system-design-primer" },
    ],
  },
];
