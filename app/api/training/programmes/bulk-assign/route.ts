import { proxyApi } from "@/app/lib/api-proxy";

// Enroll every (active) staff member of a department into a Training
// Programme in one call. Body: {programme_id, department, active_staff_only}.

export async function POST(request: Request) {
  return proxyApi("POST", {
    path: "/api/training/programmes/bulk-assign/",
    request,
  });
}
