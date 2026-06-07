export const adminStats = [
  { label: "Total Staff", value: "1,256", meta: "+12% this month" },
  { label: "Total Courses", value: "3", meta: "Active training courses" },
  { label: "Total Cohorts", value: "4", meta: "2 active cohorts" },
  { label: "Certificates Issued", value: "820", meta: "Available records" },
];

export const departments = [
  {
    id: "1",
    name: "Training",
    staffCount: 120,
    status: "Active",
  },
  {
    id: "2",
    name: "Compliance",
    staffCount: 80,
    status: "Active",
  },
  {
    id: "3",
    name: "ICT",
    staffCount: 45,
    status: "Active",
  },
];

export const staffUsers = [
  {
    id: "1",
    name: "A.F Omotade",
    email: "omotade.n@nysc.gov.ng",

    cohort: "Batch 2026-A",
    status: "Active",
  },
  {
    id: "2",
    name: "Prince Momoh",
    email: "prince.o@nysc.gov.ng",
    cohort: "Batch 2026-A",
    status: "Pending",
  },
  {
    id: "3",
    name: "Abdul Sulaiman",
    email: "abdul@nysc.gov.ng",

    cohort: "Batch 2026-B",
    status: "Active",
  },
];

export const cohorts = [
  {
    id: "1",
    name: "Batch 2026-A",
    department: "Training",
    members: 120,
    status: "Active",
  },
  {
    id: "2",
    name: "Compliance Review",
    department: "Compliance",
    members: 80,
    status: "Active",
  },
  {
    id: "3",
    name: "Batch 2026-B",
    department: "ICT",
    members: 45,
    status: "Active",
  },
];