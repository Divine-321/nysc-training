"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Award, Download, ExternalLink, Printer } from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import { formatDate as formatDateMedium } from "@/app/lib/format";

type Certificate = {
  id: number;
  certificate_id: string;
  staff_name: string;
  file_number: string;
  course_title: string;
  issued_at: string;
  pdf_url: string | null;
};

function formatDate(value: string) {
  return formatDateMedium(value, "long");
}

export default function CertificationsPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCertificates = useCallback(async () => {
    try {
      const response = await fetch("/api/training/certificates", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            response.status >= 500
              ? "The certificate service is currently returning a server error."
              : "Could not load certificates.",
          )
        );
      }

      const certificateList = readApiList<Certificate>(payload);
      setCertificates(certificateList);
      setSelectedCert((current) => current ?? certificateList[0] ?? null);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load certificates."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadCertificates();
    };

    void fetchData();
  }, [loadCertificates]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (selectedCert?.pdf_url) {
      window.open(selectedCert.pdf_url, "_blank", "noopener,noreferrer");
      return;
    }

    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-gray-800">
          Certifications
        </h2>
        <p className="text-sm text-gray-500">
          View and download your official NYSC training certificates.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading certificates...
        </p>
      ) : certificates.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          You do not have any certificates yet.
        </p>
      ) : selectedCert ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="space-y-4 lg:w-1/3">
            {certificates.map((cert) => (
              <button
                key={cert.id}
                onClick={() => setSelectedCert(cert)}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedCert.id === cert.id
                    ? "border-[#1a6b3c] bg-[#1a6b3c] text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-800 hover:border-[#1a6b3c]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 rounded-full p-2.5 ${
                      selectedCert.id === cert.id
                        ? "bg-white/20"
                        : "bg-[#f0f7f3] text-[#1a6b3c]"
                    }`}
                  >
                    <Award size={24} />
                  </div>
                  <div>
                    <h4
                      className={`mb-1.5 text-sm font-bold leading-snug ${
                        selectedCert.id === cert.id
                          ? "text-white"
                          : "text-gray-800"
                      }`}
                    >
                      {cert.course_title}
                    </h4>
                    <p
                      className={`text-xs font-medium ${
                        selectedCert.id === cert.id
                          ? "text-green-100"
                          : "text-gray-500"
                      }`}
                    >
                      Issued: {formatDate(cert.issued_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center lg:w-2/3">
            <div className="flex w-full items-center justify-between rounded-t-2xl border border-b-0 border-gray-200 bg-white p-5 print:hidden">
              <span className="text-sm font-bold text-gray-700">
                Certificate Preview
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                >
                  {selectedCert.pdf_url ? (
                    <ExternalLink size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  {selectedCert.pdf_url ? "Open PDF" : "Download PDF"}
                </button>
              </div>
            </div>

            <div className="flex w-full justify-center overflow-x-auto rounded-b-2xl border border-gray-200 bg-gray-100 p-8 print:border-none print:bg-white print:p-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
              <div
                className="relative h-[565px] w-[800px] shrink-0 bg-white shadow-2xl print:h-screen print:w-full print:shadow-none"
                id="certificate-canvas"
              >
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
                    {selectedCert.staff_name}
                  </h2>
                  <p className="mb-3 text-lg italic text-gray-700">
                    has successfully completed the training course
                  </p>
                  <h3 className="mb-14 max-w-xl text-2xl font-bold text-[#1a6b3c]">
                    {selectedCert.course_title}
                  </h3>

                  <div className="mt-auto flex w-full justify-between px-16">
                    <div className="flex w-48 flex-col items-center">
                      <div className="flex h-10 items-end">
                        <span className="font-serif text-xl italic text-gray-800">
                          {formatDate(selectedCert.issued_at)}
                        </span>
                      </div>
                      <div className="mt-2 w-full border-t border-gray-400 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          Date Issued
                        </p>
                      </div>
                    </div>

                    <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-yellow-200 bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg">
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

                    <div className="flex w-48 flex-col items-center">
                      <div className="flex h-10 items-end">
                        <span className="font-serif text-xl italic text-gray-800">
                          {selectedCert.certificate_id}
                        </span>
                      </div>
                      <div className="mt-2 w-full border-t border-gray-400 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          Certificate ID
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-xs text-gray-400">
                    File number: {selectedCert.file_number}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
