import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex">

        {/* Left — Branding */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#1a6b3c] p-12 text-white">
          <Image
            src="/images/nysc-logo.png"
            alt="NYSC Logo"
            width={180}
            height={180}
            priority
            className="mb-8"
          />
          <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight leading-tight mb-4">
            NYSC Staff <br /> E-Training Portal
          </h1>
          <p className="text-green-100 text-center text-lg max-w-md mt-2 font-medium">
            Reset your password to regain access to your dashboard and training courses.
          </p>
        </div>

        {/* Right Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm">
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

              <Link href="/login" className="block">
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