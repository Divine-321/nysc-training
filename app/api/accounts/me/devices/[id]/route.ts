import { proxyApi } from "@/app/lib/api-proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// Revoking a device forces the next admin login from it back through email
// OTP verification.
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  return proxyApi("DELETE", {
    path: `/api/accounts/me/devices/${id}/`,
    request,
  });
}
