import { certificates } from "@/app/data/courses";

export default function CertificationsPage() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#1a6b3c] mb-4">
        Certifications
      </h2>

      {certificates.length === 0 ? (
        <p className="text-gray-400 text-sm mt-2">
          Your certificates will appear here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="border rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">{cert.title}</p>

              <h3 className="font-semibold text-gray-800 mb-2">
                {cert.courseTitle}
              </h3>

              <p className="text-xs text-gray-500 mb-4">
                Issued: {cert.issueDate}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  {cert.status}
                </span>

                <button className="border border-[#1a6b3c] text-[#1a6b3c] text-xs px-4 py-2 rounded-lg hover:bg-[#e8f5ee]">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}