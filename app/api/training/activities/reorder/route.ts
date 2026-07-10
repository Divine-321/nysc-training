import { proxyApi } from "@/app/lib/api-proxy";

// Atomic drag-and-drop reordering of activities within a module.

export async function PATCH(request: Request) {
  return proxyApi("PATCH", {
    path: "/api/training/activities/reorder/",
    request,
  });
}
