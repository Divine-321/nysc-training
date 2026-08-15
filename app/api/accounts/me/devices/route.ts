import { proxyApi } from "@/app/lib/api-proxy";

// Trusted devices for the signed-in user. An admin logging in from a device
// that isn't on this list has to clear an emailed OTP first.
export async function GET(request: Request) {
  return proxyApi("GET", {
    path: "/api/accounts/me/devices/",
    request,
  });
}
