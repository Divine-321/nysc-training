import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ resource: string }>;
};

const allowedResources = new Set([
  "grade-levels",
  "posting-reasons",
  "postings",
  "ranks",
  "states",
]);

async function getPath(params: Params["params"]) {
  const { resource } = await params;
  if (!allowedResources.has(resource)) return null;
  return `/api/organization/${resource}/`;
}

export async function GET(_request: Request, { params }: Params) {
  const path = await getPath(params);
  if (!path) return Response.json({ message: "Unknown resource." }, { status: 404 });
  return proxyApi("GET", { path });
}

export async function POST(request: Request, { params }: Params) {
  const path = await getPath(params);
  if (!path) return Response.json({ message: "Unknown resource." }, { status: 404 });
  return proxyApi("POST", { path, request });
}
