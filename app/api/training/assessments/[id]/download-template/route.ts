import { proxyDownload } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Blank question-upload template for this assessment, with the exact column
// headers the bulk upload expects — the usual cause of import failures.
//
// Streamed via proxyDownload rather than proxyApi: this returns a file, and
// proxyApi discards any body that isn't JSON.
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  return proxyDownload(`/api/training/assessments/${id}/download-template/`);
}
