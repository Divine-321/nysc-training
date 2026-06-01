import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl flex items-center justify-between gap-12">

        {/* Left Illustration */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <Image
            src="/images/forgot-illustration.png"
            alt="Forgot Password"
            width={480}
            height={400}
            priority
          />
        </div>

        {/* Right Form */}
        <div className="flex-1 flex flex-col max-w-sm">
          <Image
            src="/images/nysc-logo.png"
            alt="NYSC Logo"
            width={64}
            height={64}
            className="mb-8"
          />

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter the email you used to create your account so we can send you
            instructions on how to reset your password.
          </p>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />

            <button className="w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-lg transition">
              Send
            </button>

            <Link href="/login">
              <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition">
                Back to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}