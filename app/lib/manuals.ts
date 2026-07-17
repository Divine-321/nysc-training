// Static portal manuals shipped with the frontend. The PDFs live in
// `public/manuals/`, so they are served straight from the site root with no
// backend call and no admin upload step.
//
// An admin can still attach their own PDF from Admin Settings — that one is
// fetched separately via /api/public/login-manual and shown alongside these.
export type Manual = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export const STAFF_MANUAL: Manual = {
  id: "staff",
  title: "Staff Guide",
  description:
    "How to register, take your courses, sit assessments and download your certificate.",
  href: "/manuals/staff-manual.pdf",
};

export const ADMIN_MANUAL: Manual = {
  id: "admin",
  title: "Admin Guide",
  description:
    "How to manage courses, modules, cohorts, staff records and reports.",
  href: "/manuals/admin-manual.pdf",
};

/** Filename used when a manual is downloaded rather than opened in a tab. */
export function manualDownloadName(manual: Manual): string {
  return `nysc-${manual.id}-manual.pdf`;
}
