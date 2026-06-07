export interface LiveSession {
  id: string;
  title: string;
  scheduledDate: string; // e.g., "Jun 10, 2026"
  time: string; // e.g., "09:00 AM - 10:30 AM"
  duration: string; // e.g., "90 mins"
  zoomLink: string; // A placeholder link
  meetingId?: string; // Optional
  passcode?: string; // Optional
  status: "upcoming" | "live" | "completed";
}

// Extend the existing Course interface if it's defined elsewhere,
// or assume this structure is used for the courses array directly.
// For a frontend prototype, this inline definition is fine.
export const courses = [
  {
    id: "1",
    title: "Historical Background of the NYSC",
    category: "Induction",
    categoryColor: "bg-purple-600",
    target: "Newly Recruited Staff",
    progress: 0,
    totalActivities: 3,
    completedActivities: 0,
    duration: "1 Week",
    description:
      "Learn the founding history, rationale, and context of the NYSC scheme from 1973 to present.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "in-progress",
    hasPreTest: true,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Sulaiman", initial: "S", color: "bg-[#1a6b3c]" },
    ],
    modules: [
      {
        id: "1-1",
        title: "Post-Civil War Nigeria",
        description: "Understanding the context that led to the creation of the scheme.",
        contentType: "Video / PDF",
        completed: false,
      },
      {
        id: "1-2",
        title: "Decree No. 24 of 1973",
        description: "The legal founding document of the NYSC.",
        contentType: "Text / PDF",
        completed: false,
      },
      {
        id: "1-3",
        title: "Evolution of the Scheme",
        description: "How the NYSC has adapted over the decades.",
        contentType: "Text / Video",
        completed: false,
      },
    ],
    liveSessions: [] as LiveSession[],
  },
  {
    id: "2",
    title: "Mission/ Vision statements",
    category: "Induction",
    categoryColor: "bg-blue-600",
    target: "Newly Recruited Staff",
    progress: 0,
    totalActivities: 3,
    completedActivities: 0,
    duration: "1 Week",
    description:
      "Understand the core mission, vision, and values guiding the NYSC operations nationwide.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "upcoming",
    hasPreTest: true,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Nasir", initial: "N", color: "bg-blue-600" },
    ],
    modules: [
      {
        id: "2-1",
        title: "The NYSC Vision",
        description:
          "Detailed breakdown of the NYSC vision statement.",
        contentType: "Text",
        completed: false,
      },
      {
        id: "2-2",
        title: "The NYSC Mission",
        description:
          "Detailed breakdown of the NYSC mission statement.",
        contentType: "Video / PDF",
        completed: false,
      },
      {
        id: "2-3",
        title: "Core Values",
        description:
          "The ethical compass and core values of the scheme.",
        contentType: "PDF",
        completed: false,
      },
    ],
    liveSessions: [] as LiveSession[],
  },
  {
    id: "3",
    title: "Objectives of the NYSC",
    category: "Induction",
    categoryColor: "bg-orange-500",
    target: "Newly Recruited Staff",
    progress: 0,
    totalActivities: 4,
    completedActivities: 0,
    duration: "1 Week",
    description:
      "Review the primary statutory goals and socio-economic objectives of the scheme.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "upcoming",
    hasPreTest: false,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Favour", initial: "F", color: "bg-orange-500" },
    ],
    modules: [
      {
        id: "3-1",
        title: "National Unity and Integration",
        description:
          "How NYSC fosters unity across diverse ethnic groups.",
        contentType: "Video",
        completed: false,
      },
      {
        id: "3-2",
        title: "Youth Discipline and Industry",
        description:
          "Instilling moral discipline in Nigerian youths.",
        contentType: "Text",
        completed: false,
      },
      {
        id: "3-3",
        title: "Skill Development",
        description:
          "Equipping youths for self-reliance.",
        contentType: "PDF",
        completed: false,
      },
      {
        id: "3-4",
        title: "National Development",
        description:
          "The role of corps members in socio-economic development.",
        contentType: "Text",
        completed: false,
      },
    ],
    liveSessions: [] as LiveSession[],
  },
  {
    id: "4",
    title: "NYSC cardinal programmes",
    category: "Induction",
    categoryColor: "bg-[#1a6b3c]",
    target: "Newly Recruited Staff",
    progress: 0,
    totalActivities: 4,
    completedActivities: 0,
    duration: "2 Weeks",
    description:
      "Explore the four cardinal programmes of the NYSC and their implementation.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "upcoming",
    hasPreTest: true,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Abba Admin", initial: "A", color: "bg-gray-900" },
    ],
    modules: [
      {
        id: "4-1",
        title: "Orientation Course",
        description:
          "The 21-day camp activities and objectives.",
        contentType: "Video",
        completed: false,
      },
      {
        id: "4-2",
        title: "Primary Assignment",
        description:
          "Posting guidelines and PPA responsibilities.",
        contentType: "PDF",
        completed: false,
      },
      {
        id: "4-3",
        title: "Community Development Service (CDS)",
        description:
          "Types of CDS and their impact on communities.",
        contentType: "Text / Video",
        completed: false,
      },
      {
        id: "4-4",
        title: "Winding-Up and Passing-Out",
        description:
          "The final phase of the service year.",
        contentType: "Video / PDF",
        completed: false,
      },
    ],
    liveSessions: [] as LiveSession[],
  },
];

export const stats = [
  {
    label: "Courses Assigned",
    value: courses.length,
    color: "bg-[#e8f5ee]",
    text: "text-[#1a6b3c]",
  },
  {
    label: "In Progress",
    value: courses.filter((course) => course.status === "in-progress").length,
    color: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    label: "Completed",
    value: courses.filter((course) => course.status === "completed").length,
    color: "bg-yellow-50",
    text: "text-yellow-600",
  },
];

export const deadlines = [
  { title: "NYSC Mandates Quiz", due: "Jun 10, 2026" },
  { title: "Cybersecurity Test", due: "Jun 18, 2026" },
  { title: "End of Course Evaluation", due: "Jun 25, 2026" },
];

export const results = [
  {
    id: 1,
    courseTitle: "Historical Background of the NYSC",
    assessment: "Pre-Course Test",
    score: 85,
    status: "Passed",
    date: "Jun 01, 2026",
  },
  {
    id: 2,
    courseTitle: "Objectives of the NYSC",
    assessment: "Module Quiz",
    score: 68,
    status: "Failed",
    date: "Jun 03, 2026",
  },
];

export const certificates = [
  {
    id: 1,
    title: "Certificate of Completion",
    courseTitle: "NYSC cardinal programmes",
    issueDate: "Jun 05, 2026",
    status: "Available",
  },
];

export const questions = [
  {
    id: 1,
    question:
      "What is one major benefit of moving from paper records to digital systems?",
    options: [
      "It makes records harder to find",
      "It improves access, storage, and tracking",
      "It removes the need for staff",
      "It makes all data public",
    ],
    answer: 1,
  },
  {
    id: 2,
    question: "What should staff do when handling official data?",
    options: [
      "Share it freely",
      "Protect it responsibly",
      "Store it only on WhatsApp",
      "Post it online",
    ],
    answer: 1,
  },
  {
    id: 3,
    question: "Why is digital literacy important?",
    options: [
      "It helps staff use modern tools effectively",
      "It replaces all office work",
      "It is only for ICT staff",
      "It removes training needs",
    ],
    answer: 0,
  },
];