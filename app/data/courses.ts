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
    id: "4",
    title: "Induction Training",
    category: "Onboarding",
    categoryColor: "bg-purple-600",
    target: "Newly Recruited Staff",
    progress: 0,
    totalActivities: 18,
    completedActivities: 0,
    duration: "4 Weeks",
    description:
      "Comprehensive induction training covering the history, structure, rules, and operations of the NYSC for all newly recruited staff.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "in-progress",
    hasPreTest: true,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Sulaiman", initial: "S", color: "bg-[#1a6b3c]" },
      { name: "Nasir", initial: "N", color: "bg-blue-600" },
    ],
    modules: [
      {
        id: "1",
        title: "Historical Background of the NYSC",
        description: "Learn the founding history, rationale, and context of the NYSC scheme.",
        contentType: "Video / PDF",
        completed: false,
      },
      {
        id: "2",
        title: "Mission/ Vision statements",
        description: "Understand the core mission and vision guiding the NYSC operations.",
        contentType: "Text / PDF",
        completed: false,
      },
      {
        id: "3",
        title: "Objectives of the NYSC",
        description: "Review the primary statutory goals and objectives of the scheme.",
        contentType: "Text / Video",
        completed: false,
      },
      {
        id: "4",
        title: "NYSC cardinal programmes",
        description: "Explore the four cardinal programmes of the NYSC and their implementation.",
        contentType: "PDF / Video",
        completed: false,
      },
      {
        id: "5",
        title: "NYSC organizational structure",
        description: "Learn about the hierarchy, directorates, and departmental structure of the NYSC.",
        contentType: "Text / PDF",
        completed: false,
      },
      {
        id: "6",
        title: "NYSC Conditions of Service",
        description: "Review the official terms, benefits, and conditions of service for NYSC staff.",
        contentType: "PDF",
        completed: false,
      },
      {
        id: "7",
        title: "Public Service Rules",
        description: "Understand the PSR and its direct application to NYSC staff conduct.",
        contentType: "Text / PDF",
        completed: false,
      },
      {
        id: "8",
        title: "The qualities and duties of the Inspector",
        description: "Learn what makes an effective NYSC Inspector and their field duties.",
        contentType: "Video",
        completed: false,
      },
      {
        id: "9",
        title: "The role of support staff",
        description: "Understand the vital administrative and logistical responsibilities of support personnel.",
        contentType: "Text",
        completed: false,
      },
      {
        id: "10",
        title: "Work Ethics and Code of Conduct",
        description: "Learn the expected professional behavior, ethics, and disciplinary measures.",
        contentType: "Video / PDF",
        completed: false,
      },
      {
        id: "11",
        title: "Teamwork and Interpersonal Relationships",
        description: "Develop skills for effective collaboration and communication in the workplace.",
        contentType: "Audio / Text",
        completed: false,
      },
      {
        id: "12",
        title: "Managing Corps Members",
        description: "Best practices and empathetic approaches for mentoring and managing corps members.",
        contentType: "Video",
        completed: false,
      },
      {
        id: "13",
        title: "Introduction to Report Writing and Documentation",
        description: "Learn the standards, formats, and best practices for official NYSC reporting.",
        contentType: "PDF / Text",
        completed: false,
      },
      {
        id: "14",
        title: "Orientation camp and camp committees",
        description: "Detailed overview of 21-day camp operations and the roles of various camp committees.",
        contentType: "Video",
        completed: false,
      },
      {
        id: "15",
        title: "Office Procedures",
        description: "Standard operating procedures for managing files, correspondence, and daily office tasks.",
        contentType: "Text / PDF",
        completed: false,
      },
      {
        id: "16",
        title: "Security protocols in NYSC",
        description: "Essential security guidelines, risk management, and emergency protocols.",
        contentType: "Video / PDF",
        completed: false,
      },
      {
        id: "17",
        title: "Conflict Management",
        description: "Techniques for resolving workplace disputes and managing grievances professionally.",
        contentType: "Audio / Video",
        completed: false,
      },
      {
        id: "18",
        title: "Time Management",
        description: "Strategies for effective task prioritization and time management in the public service.",
        contentType: "Text / Video",
        completed: false,
      },
    ],
    liveSessions: [
      {
        id: "LS-004-A",
        title: "Induction Welcome & Q&A Session",
        scheduledDate: "Jul 05, 2026",
        time: "10:00 AM - 11:30 AM",
        duration: "90 mins",
        zoomLink: "https://zoom.us/j/example4A",
        meetingId: "456-789-1230",
        passcode: "WELCOME26",
        status: "upcoming",
      },
    ],
  },
  {
    id: "1",
    title: "NYSC Mandates & Public Administration",
    category: "Legal Compliance",
    categoryColor: "bg-red-500",
    target: "NYSC Permanent Staff",
    progress: 70,
    totalActivities: 100,
    completedActivities: 70,
    duration: "1 Month",
    description:
      "Teaches the legal framework, mobilization rules, and anti-fraud administrative protocols.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "in-progress",
    hasPreTest: true,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Sulaiman", initial: "S", color: "bg-[#1a6b3c]" },
      { name: "Nasir", initial: "N", color: "bg-blue-600" },
      { name: "Favour", initial: "F", color: "bg-orange-500" },
    ],
    modules: [
      {
        id: "1",
        title: "Introduction to NYSC Mandates",
        description:
          "Understand the legal foundation, purpose, and operational mandate of NYSC.",
        contentType: "Text / PDF / Video",
        completed: true,
      },
      {
        id: "2",
        title: "Public Administration Basics",
        description:
          "Learn the basic principles of public service administration and institutional accountability.",
        contentType: "Video / PDF",
        completed: true,
      },
      {
        id: "3",
        title: "Compliance and Reporting",
        description:
          "Understand documentation, reporting duties, and compliance expectations.",
        contentType: "Text / Video",
        completed: false,
      },
      {
        id: "4",
        title: "Anti-Fraud Administrative Protocols",
        description:
          "Learn how to identify, prevent, and report administrative irregularities.",
        contentType: "PDF / Text",
        completed: false,
      },
    ],
    liveSessions: [
      {
        id: "LS-001-A",
        title: "NYSC Mandates: Legal Framework Overview",
        scheduledDate: "Jun 10, 2026",
        time: "09:00 AM - 10:30 AM",
        duration: "90 mins",
        zoomLink: "https://zoom.us/j/example1A",
        meetingId: "123-456-7890",
        passcode: "NYSC123",
        status: "upcoming",
      },
      {
        id: "LS-001-B",
        title: "Public Administration Q&A",
        scheduledDate: "May 28, 2026", // Past date
        time: "02:00 PM - 03:00 PM",
        duration: "60 mins",
        zoomLink: "https://zoom.us/j/example1B",
        status: "completed",
      },
    ],
  },
  {
    id: "2",
    title: "Camp Operations & Field Logistics",
    category: "Logistics Management",
    categoryColor: "bg-blue-500",
    target: "NYSC Camp Staff",
    progress: 50,
    totalActivities: 100,
    completedActivities: 50,
    duration: "3 Weeks",
    description:
      "Covers 21-day orientation logistics, kitting, feeding, and military-police security coordination.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "in-progress",
    hasPreTest: true,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Nasir", initial: "N", color: "bg-blue-600" },
      { name: "Favour", initial: "F", color: "bg-orange-500" },
    ],
    modules: [
      {
        id: "1",
        title: "Orientation Camp Structure",
        description:
          "Learn how the NYSC orientation camp is organized and coordinated.",
        contentType: "Text / PDF",
        completed: true,
      },
      {
        id: "2",
        title: "Kitting and Feeding Logistics",
        description:
          "Understand logistics planning for corps member kits, feeding, and supplies.",
        contentType: "Video / PDF",
        completed: false,
      },
      {
        id: "3",
        title: "Security Coordination",
        description:
          "Learn the basics of coordinating with security agencies during camp operations.",
        contentType: "Text / Video",
        completed: false,
      },
    ],
    liveSessions: [
      {
        id: "LS-002-A",
        title: "Camp Logistics Briefing",
        scheduledDate: "Jun 15, 2026",
        time: "11:00 AM - 12:00 PM",
        duration: "60 mins",
        zoomLink: "https://zoom.us/j/example2A",
        meetingId: "987-654-3210",
        passcode: "CAMP456",
        status: "upcoming",
      },
      {
        id: "LS-002-B",
        title: "Security Protocols Review",
        scheduledDate: "Jun 01, 2026", // Past date
        time: "01:00 PM - 02:30 PM",
        duration: "90 mins",
        zoomLink: "https://zoom.us/j/example2B",
        status: "completed",
      },
    ],
  },
  {
    id: "3",
    title: "Youth Mentorship & Program Supervision",
    category: "Field Oversight",
    categoryColor: "bg-red-400",
    target: "NYSC Field Officers",
    progress: 30,
    totalActivities: 100,
    completedActivities: 30,
    duration: "3 Months",
    description:
      "Trains staff in corps member mediation, SAED tracking, and project monitoring.",
    image: "/images/course-thumb.png",
    heroImage: "/images/course-hero.png",
    status: "in-progress",
    hasPreTest: false,
    hasPostTest: true,
    hasEvaluation: true,
    instructors: [
      { name: "Sulaiman", initial: "S", color: "bg-[#1a6b3c]" },
      { name: "Favour", initial: "F", color: "bg-orange-500" },
    ],
    modules: [
      {
        id: "1",
        title: "Mentorship Fundamentals",
        description:
          "Understand the role of NYSC staff in mentoring and guiding corps members.",
        contentType: "Text / PDF / Audio",
        completed: false,
      },
      {
        id: "2",
        title: "SAED Tracking",
        description:
          "Learn how to monitor skill acquisition programmes and track corps member participation.",
        contentType: "PDF / Video",
        completed: false,
      },
      {
        id: "3",
        title: "Project Monitoring",
        description:
          "Understand project supervision, documentation, and reporting processes.",
        contentType: "Text / Video",
        completed: false,
      },
    ],
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
    courseTitle: "NYSC Mandates & Public Administration",
    assessment: "Pre-Course Test",
    score: 85,
    status: "Passed",
    date: "Jun 01, 2026",
  },
  {
    id: 2,
    courseTitle: "Camp Operations & Field Logistics",
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
    courseTitle: "NYSC Mandates & Public Administration",
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