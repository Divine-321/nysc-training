"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Award, Printer } from "lucide-react";

function formatCertificateDate(value: string) {
  if (!value) return "Select date";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

export default function AdminCertificatesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [staffName, setStaffName] = useState("Adeyemi Charles");
  const [fileNumber, setFileNumber] = useState("NYSC/STAFF/001");
  const [courseTitle, setCourseTitle] = useState(
    "NYSC Orientation and Administrative Training",
  );
  const [certificateId, setCertificateId] = useState("NYSC-CERT-2026-0001");
  const [issuedAt, setIssuedAt] = useState(today);
  const [authorizedBy, setAuthorizedBy] = useState("Director, Training");

  const formattedDate = useMemo(
    () => formatCertificateDate(issuedAt),
    [issuedAt],
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Certificate Design
          </h2>
          <p className="text-sm text-gray-500">
            Preview what staff certificates will look like after completion.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-3 text-sm font-semibold text-white shadow-sm print:hidden"
        >
          <Printer size={18} />
          Print preview
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm print:hidden">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-[#1a6b3c]">
              <Award size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Preview details</h3>
              <p className="text-xs text-gray-500">
                Change these fields to test the certificate.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Staff name
              </span>
              <input
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                File number
              </span>
              <input
                value={fileNumber}
                onChange={(event) => setFileNumber(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Course title
              </span>
              <textarea
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Certificate ID
              </span>
              <input
                value={certificateId}
                onChange={(event) => setCertificateId(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Date issued
              </span>
              <input
                type="date"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Authorized by
              </span>
              <input
                value={authorizedBy}
                onChange={(event) => setAuthorizedBy(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-sm print:border-none print:bg-white print:p-0 print:shadow-none">
          <div className="relative h-[565px] w-[800px] shrink-0 bg-white shadow-2xl print:h-screen print:w-full print:shadow-none">
            <div className="absolute inset-5 border-[3px] border-[#1a6b3c] p-2">
              <div className="absolute inset-0 m-1 border border-[#1a6b3c]/30" />
            </div>
            <div className="absolute left-5 top-5 h-10 w-10 border-l-4 border-t-4 border-[#1a6b3c]" />
            <div className="absolute right-5 top-5 h-10 w-10 border-r-4 border-t-4 border-[#1a6b3c]" />
            <div className="absolute bottom-5 left-5 h-10 w-10 border-b-4 border-l-4 border-[#1a6b3c]" />
            <div className="absolute bottom-5 right-5 h-10 w-10 border-b-4 border-r-4 border-[#1a6b3c]" />

            <div className="relative z-10 flex h-full flex-col items-center justify-center p-12 text-center">
              <Image
                src="/images/nysc-logo.png"
                alt="NYSC Logo"
                width={90}
                height={90}
                className="mb-6 opacity-90"
              />

              <h1 className="mb-3 font-serif text-4xl font-bold uppercase tracking-widest text-[#1a6b3c]">
                Certificate of Completion
              </h1>
              <p className="mb-10 text-sm font-medium uppercase tracking-widest text-gray-500">
                National Youth Service Corps E-Training
              </p>

              <p className="mb-4 text-lg italic text-gray-700">
                This is to proudly certify that
              </p>
              <h2 className="mb-8 inline-block border-b-2 border-gray-300 px-16 pb-2 font-serif text-5xl font-bold text-gray-900">
                {staffName || "Staff Name"}
              </h2>

              <p className="mb-3 text-lg italic text-gray-700">
                has successfully completed the training course
              </p>
              <h3 className="mb-14 max-w-xl text-2xl font-bold text-[#1a6b3c]">
                {courseTitle || "Course Title"}
              </h3>

              <div className="mt-auto grid w-full grid-cols-3 items-end gap-8 px-8">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 items-end">
                    <span className="font-serif text-lg italic text-gray-800">
                      {formattedDate}
                    </span>
                  </div>
                  <div className="mt-2 w-full border-t border-gray-400 pt-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      Date Issued
                    </p>
                  </div>
                </div>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-yellow-200 bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-yellow-700">
                    <span className="text-center text-[11px] font-bold uppercase leading-tight tracking-widest text-yellow-900">
                      Official
                      <br />
                      NYSC
                      <br />
                      Seal
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex h-10 items-end text-center">
                    <span className="font-serif text-lg italic text-gray-800">
                      {authorizedBy || "Authorized Officer"}
                    </span>
                  </div>
                  <div className="mt-2 w-full border-t border-gray-400 pt-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      Authorized By
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-6 text-xs text-gray-400">
                <span>File number: {fileNumber || "N/A"}</span>
                <span>Certificate ID: {certificateId || "N/A"}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
