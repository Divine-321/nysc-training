import { proxyApi } from "@/app/lib/api-proxy";

// Step 1 of the password reset flow: sends a 6-digit OTP (valid 10 minutes)
// to the account's registered email. The backend always returns 200 so
// account existence cannot be probed.
// Body: { login: <file_number or email> }

export async function POST(request: Request) {
  return proxyApi("POST", {
    auth: false,
    path: "/api/accounts/auth/forgot-password/",
    request,
  });
}
