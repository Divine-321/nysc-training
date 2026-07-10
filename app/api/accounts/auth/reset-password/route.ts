import { proxyApi } from "@/app/lib/api-proxy";

// Step 2 of the password reset flow: submits the OTP and the new password.
// Body: { email, otp, new_password, confirm_password }

export async function POST(request: Request) {
  return proxyApi("POST", {
    auth: false,
    path: "/api/accounts/auth/reset-password/",
    request,
  });
}
