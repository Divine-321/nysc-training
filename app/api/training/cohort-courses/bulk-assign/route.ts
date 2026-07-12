import { proxyApi } from "@/app/lib/api-proxy";

// Enroll every (active) staff member of a department into a Training
// Programme in one call. Body: {cohort_course_id, department, active_staff_only}.

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/cohort-courses/bulk-assign/",
    request,
  });
}
