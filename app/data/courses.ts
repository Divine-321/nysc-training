export const courses = [
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