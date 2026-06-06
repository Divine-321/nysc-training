"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Award, Printer } from "lucide-react";

const completedCourses = [
  {
    id: "CERT-001",
    courseTitle: "NYSC Mandates & Public Administration",
    date: "June 05, 2026",
    instructor: "Sulaiman Nasir"
  },
  {
    id: "CERT-002",
    courseTitle: "Historical Background of the NYSC",
    date: "May 25, 2026",
    instructor: "Abba Admin"
  }
];

export default function CertificationsPage() {
  const [selectedCert, setSelectedCert] = useState(completedCourses[0]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Certifications</h2>
        <p className="text-sm text-gray-500">View and download your official NYSC training certificates.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Certificate List */}
        <div className="lg:w-1/3 space-y-4">
          {completedCourses.map((cert) => (
            <button
              key={cert.id}
              onClick={() => setSelectedCert(cert)}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                selectedCert.id === cert.id 
                ? "bg-[#1a6b3c] border-[#1a6b3c] text-white shadow-md" 
                : "bg-white border-gray-200 hover:border-[#1a6b3c] text-gray-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-full shrink-0 ${selectedCert.id === cert.id ? "bg-white/20" : "bg-[#f0f7f3] text-[#1a6b3c]"}`}>
                  <Award size={24} />
                </div>
                <div>
                  <h4 className={`font-bold text-sm leading-snug mb-1.5 ${selectedCert.id === cert.id ? "text-white" : "text-gray-800"}`}>
                    {cert.courseTitle}
                  </h4>
                  <p className={`text-xs font-medium ${selectedCert.id === cert.id ? "text-green-100" : "text-gray-500"}`}>
                    Issued: {cert.date}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Certificate Preview */}
        <div className="lg:w-2/3 flex flex-col items-center">
          {/* Toolbar */}
          <div className="w-full flex justify-between items-center bg-white p-5 rounded-t-2xl border border-gray-200 border-b-0 print:hidden">
            <span className="text-sm font-bold text-gray-700">Certificate Preview</span>
            <div className="flex gap-3">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition">
                <Printer size={16} /> Print
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#1a6b3c] hover:bg-[#145530] text-white rounded-lg text-sm font-semibold transition shadow-sm">
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>

          {/* The Certificate Landscape Canvas */}
          <div className="w-full bg-gray-100 p-8 rounded-b-2xl border border-gray-200 flex justify-center overflow-x-auto print:p-0 print:border-none print:bg-white">
            <div className="w-[800px] h-[565px] bg-white shadow-2xl relative shrink-0 print:shadow-none print:w-[100%] print:h-screen" id="certificate-canvas">
              {/* Decorative Borders */}
              <div className="absolute inset-5 border-[3px] border-[#1a6b3c] p-2">
                <div className="absolute inset-0 border border-[#1a6b3c]/30 m-1"></div>
              </div>
              {/* Corner Ornaments */}
              <div className="absolute top-5 left-5 w-10 h-10 border-t-4 border-l-4 border-[#1a6b3c]"></div>
              <div className="absolute top-5 right-5 w-10 h-10 border-t-4 border-r-4 border-[#1a6b3c]"></div>
              <div className="absolute bottom-5 left-5 w-10 h-10 border-b-4 border-l-4 border-[#1a6b3c]"></div>
              <div className="absolute bottom-5 right-5 w-10 h-10 border-b-4 border-r-4 border-[#1a6b3c]"></div>
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-center">
                <Image src="/images/nysc-logo.png" alt="NYSC Logo" width={90} height={90} className="mb-6 opacity-90" />
                <h1 className="text-4xl font-serif font-bold text-[#1a6b3c] tracking-widest mb-3 uppercase">Certificate of Completion</h1>
                <p className="text-gray-500 font-medium tracking-widest text-sm uppercase mb-10">National Youth Service Corps E-Training</p>
                <p className="text-lg text-gray-700 italic mb-4">This is to proudly certify that</p>
                <h2 className="text-5xl font-bold text-gray-900 font-serif border-b-2 border-gray-300 pb-2 px-16 mb-8 inline-block">Favour</h2>
                <p className="text-lg text-gray-700 italic mb-3">has successfully completed the training module</p>
                <h3 className="text-2xl font-bold text-[#1a6b3c] mb-14 max-w-xl">{selectedCert.courseTitle}</h3>
                <div className="flex justify-between w-full px-16 mt-auto">
                  <div className="flex flex-col items-center w-48"><div className="h-10 flex items-end"><span className="font-serif italic text-gray-800 text-xl">{selectedCert.date}</span></div><div className="w-full border-t border-gray-400 mt-2 pt-2"><p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date Issued</p></div></div>
                  {/* Gold Seal Mock */}
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center shadow-lg border-4 border-yellow-200"><div className="w-24 h-24 rounded-full border border-yellow-700 flex items-center justify-center"><span className="text-yellow-900 font-bold text-[11px] text-center uppercase leading-tight tracking-widest">Official<br/>NYSC<br/>Seal</span></div></div>
                  <div className="flex flex-col items-center w-48"><div className="h-10 flex items-end"><span className="font-serif italic text-gray-800 text-xl">{selectedCert.instructor}</span></div><div className="w-full border-t border-gray-400 mt-2 pt-2"><p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Authorized Signature</p></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}