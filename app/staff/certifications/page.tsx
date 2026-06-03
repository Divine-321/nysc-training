import { certificates } from "@/app/data/courses";
import { Award, Download, ExternalLink, ShieldCheck } from "lucide-react";

export default function CertificationsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">My Certifications</h2>
        <p className="text-sm text-gray-500">View, download, and share your earned certificates from completed training programs.</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
            <Award size={40} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No certificates yet</h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Complete courses and pass their final assessments to earn your official NYSC training certificates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition">
              
              {/* Decorative Side */}
              <div className="bg-[#f0f7f3] sm:w-56 p-6 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-100 shrink-0 relative overflow-hidden">
                <ShieldCheck size={120} className="absolute text-green-100/50 -right-4 -bottom-4" />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 z-10">
                  <Award size={32} className="text-[#1a6b3c]" />
                </div>
                <span className="text-[10px] font-bold text-[#1a6b3c] tracking-widest uppercase text-center z-10">NYSC Certified</span>
              </div>

              {/* Card Content */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{cert.title}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold shadow-sm">
                      {cert.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight max-w-md">{cert.courseTitle}</h3>
                  <p className="text-sm text-gray-500 font-medium">Issued: <span className="text-gray-700">{cert.issueDate}</span></p>
                </div>

                <div className="flex items-center gap-3 mt-8 pt-5 border-t border-gray-100">
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                    <Download size={16} /> Download PDF
                  </button>
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 px-6 py-2.5 rounded-xl text-sm font-semibold transition">
                    <ExternalLink size={16} /> Share Link
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}