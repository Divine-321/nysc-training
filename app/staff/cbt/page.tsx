import { PlayCircle, Clock, FileText, CheckCircle2, AlertCircle, Timer, Award } from "lucide-react";
import Link from "next/link";

const upcomingExams = [
  {
    id: "EXM-101",
    title: "Historical Background & Objectives",
    course: "Historical Background of the NYSC",
    duration: "45 Mins",
    questions: 50,
    dueDate: "Jun 15, 2026",
    status: "Pending",
    icon: Timer,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    id: "EXM-102",
    title: "NYSC Cardinal Programmes Final Exam",
    course: "NYSC cardinal programmes",
    duration: "60 Mins",
    questions: 75,
    dueDate: "Jun 20, 2026",
    status: "Available",
    icon: FileText,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50"
  }
];

const completedExams = [
  {
    id: "EXM-099",
    title: "Conditions of Service Quiz",
    course: "NYSC Conditions of Service",
    dateTaken: "May 25, 2026",
    score: 92,
    total: 100,
    status: "Passed",
  },
  {
    id: "EXM-098",
    title: "Work Ethics & Code of Conduct Test",
    course: "Work Ethics and Code of Conduct",
    dateTaken: "May 10, 2026",
    score: 85,
    total: 100,
    status: "Passed",
  }
];

export default function CBTPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">CBT Examinations</h2>
        <p className="text-sm text-gray-500">Access your scheduled Computer Based Tests and view past results.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Upcoming Exams</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-1">2</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-[#1a6b3c] shrink-0">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Completed Exams</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-1">14</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
            <Award size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Average Score</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-1">88%</h3>
          </div>
        </div>
      </div>

      {/* Upcoming Exams */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={20} className="text-[#1a6b3c]" />
          <h3 className="text-lg font-bold text-gray-800">Available & Upcoming</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {upcomingExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${exam.bgColor} ${exam.color} shadow-sm`}>
                  <exam.icon size={24} />
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${exam.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {exam.status}
                </span>
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">{exam.title}</h4>
              <p className="text-sm text-[#1a6b3c] font-bold mb-5">{exam.course}</p>
              
              <div className="flex items-center gap-5 text-sm text-gray-500 font-medium mb-8">
                <span className="flex items-center gap-1.5"><Timer size={16} /> {exam.duration}</span>
                <span className="flex items-center gap-1.5"><FileText size={16} /> {exam.questions} Questions</span>
                <span className="flex items-center gap-1.5"><Clock size={16} /> Due: {exam.dueDate}</span>
              </div>
              
              <div className="mt-auto">
                {exam.status === 'Available' ? (
                  <Link 
                    href={`/staff/cbt/${exam.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition shadow-sm bg-[#1a6b3c] text-white hover:bg-[#145530]"
                  >
                    <PlayCircle size={18} />
                    Start Examination
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition shadow-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    <PlayCircle size={18} />
                    Not Yet Available
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Recent Exam Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Exam ID</th>
                <th className="px-6 py-4 font-medium">Exam Title</th>
                <th className="px-6 py-4 font-medium">Date Taken</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {completedExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{exam.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{exam.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{exam.course}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{exam.dateTaken}</td>
                  <td className="px-6 py-4">
                    <span className="text-gray-800 font-extrabold">{exam.score}</span>
                    <span className="text-gray-400 font-medium"> / {exam.total}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                      exam.status === 'Passed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {exam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}