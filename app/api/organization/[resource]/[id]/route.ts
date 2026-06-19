import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ resource: string; id: string }>;
};

const allowedResources = new Set([
  "departments",
  "grade-levels",
  "posting-reasons",
  "postings",
  "ranks",
  "states",
]);

async function getPath(params: Params["params"]) {
  const { resource, id } = await params;
  if (!allowedResources.has(resource)) return null;
  return `/api/organization/${resource}/${id}/`;
}

export async function GET(_request: Request, { params }: Params) {
  const path = await getPath(params);
  if (!path) return Response.json({ message: "Unknown resource." }, { status: 404 });
  return proxyApi("GET", { path });
}

export async function PATCH(request: Request, { params }: Params) {
  const path = await getPath(params);
  if (!path) return Response.json({ message: "Unknown resource." }, { status: 404 });
  return proxyApi("PATCH", { path, request });
}

export async function DELETE(_request: Request, { params }: Params) {
  const path = await getPath(params);
  if (!path) return Response.json({ message: "Unknown resource." }, { status: 404 });
  return proxyApi("DELETE", { path });
}
