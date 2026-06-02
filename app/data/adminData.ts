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
    name: "Angela N.",
    email: "angela.n@nysc.gov.ng",
    department: "Training",
    cohort: "Batch 2026-A",
    status: "Active",
  },
  {
    id: "2",
    name: "Mobolaji O.",
    email: "mobolaji.o@nysc.gov.ng",
    department: "Compliance",
    cohort: "Batch 2026-A",
    status: "Pending",
  },
  {
    id: "3",
    name: "Favour Edward",
    email: "favour@nysc.gov.ng",
    department: "ICT",
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