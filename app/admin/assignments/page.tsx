"use client";

import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal, X, BookOpen, Users, Calendar, Target, UserCheck, AlertCircle } from "lucide-react";
import { courses } from "@/app/data/courses";
import { cohorts, departments, staffUsers } from "@/app/data/adminData";

const mockAssignments = [
  {
    id: "ASN-001",
    courseId: "1",
    courseTitle: "Historical Background of the NYSC",
    targetType: "Cohort",
    targetName: "Junior staff",
    traineeCount: 450,
    assignedTrainers: ["Sulaiman", "Nasir"],
    deadline: "Jul 30, 2026",
    status: "Active",
    progress: 45,
  },
  {
    id: "ASN-002",
    courseId: "2",
    courseTitle: "Mission/ Vision statements",
    targetType: "Department",
    targetName: "Information and Communications Technology (ICT)",
    traineeCount: 45,
    assignedTrainers: ["Favour"],
    deadline: "Jun 10, 2026",
    status: "Completed",
    progress: 100,
  },
  {
    id: "ASN-003",
    courseId: "4",
    courseTitle: "NYSC cardinal programmes",
    targetType: "Staff Range",
    targetName: "NYSC/1000 - NYSC/1500",
    traineeCount: 500,
    assignedTrainers: ["Nasir"],
    deadline: "Aug 15, 2026",
    status: "Upcoming",
    progress: 0,
  }
];

type Assignment = typeof mockAssignments[0];

export default function AssignmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || "");
  const [assignmentType, setAssignmentType] = useState<"staff" | "department" | "cohort" | "file-range">("staff");
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Course Assignments</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage active training assignments and monitor group progress.
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} className={showForm ? "rotate-45 transition-transform" : "transition-transform"} />
          {showForm ? "Close Form" : "Create Assignment"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6 max-w-4xl">
          <h3 className="font-bold text-[#1a6b3c] text-lg border-b border-gray-100 pb-3">New Assignment</h3>
          <div>
            <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Course
            </label>
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="trainer-select" className="block text-sm font-medium text-gray-700 mb-2">
              Assign Trainers
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 bg-white">
              {staffUsers.map((staff) => (
                <label key={`trainer-${staff.id}`} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer transition">
                  <input
                    type="checkbox"
                    value={staff.id}
                    checked={selectedTrainers.includes(staff.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTrainers([...selectedTrainers, staff.id]);
                      } else {
                        setSelectedTrainers(selectedTrainers.filter((id) => id !== staff.id));
                      }
                    }}
                    className="w-4 h-4 accent-[#1a6b3c] border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">
                    {staff.name} <span className="text-gray-400">({staff.department})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="assignment-type" className="block text-sm font-medium text-gray-700 mb-2">
              Assign Trainees By
            </label>
            <select
              id="assignment-type"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value as "staff" | "department" | "cohort" | "file-range")}
            >
              <option value="staff">Individual Staff</option>
              <option value="file-range">File Number Range</option>
              <option value="department">Department</option>
              <option value="cohort">Cohort</option>
            </select>
          </div>

          <div>
            <label htmlFor="target-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Trainees
            </label>
            
            {assignmentType === "staff" && (
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 bg-white">
                {staffUsers.map((staff) => (
                  <label key={`trainee-${staff.id}`} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer transition">
                    <input
                      type="checkbox"
                      value={staff.id}
                      checked={selectedTrainees.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTrainees([...selectedTrainees, staff.id]);
                        } else {
                          setSelectedTrainees(selectedTrainees.filter((id) => id !== staff.id));
                        }
                      }}
                      className="w-4 h-4 accent-[#1a6b3c] border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">
                      {staff.name} <span className="text-gray-400">({staff.email})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {assignmentType === "file-range" && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <input type="text" placeholder="Start File No. (e.g. NYSC/1000)" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent" />
                </div>
                <div className="flex-1">
                  <input type="text" placeholder="End File No. (e.g. NYSC/1500)" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent" />
                </div>
              </div>
            )}

            {(assignmentType === "department" || assignmentType === "cohort") && (
              <select
                id="target-select"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
              >
                {assignmentType === "department" && (
                  <optgroup label="Departments">
                    {departments.map((dept) => (
                      <option key={dept.id}>{dept.name}</option>
                    ))}
                  </optgroup>
                )}
                {assignmentType === "cohort" && (
                  <optgroup label="Cohorts">
                    {cohorts.map((cohort) => (
                      <option key={cohort.id}>{cohort.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="deadline-date" className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Deadline
            </label>
            <input
              id="deadline-date"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
            />
          </div>
          <div className="pt-2">
            <button 
              onClick={() => setShowForm(false)}
              className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold transition shadow-sm"
            >
              Assign Course
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments by course or target..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Course Title</th>
                <th className="px-6 py-4 font-medium">Assigned Target</th>
                <th className="px-6 py-4 font-medium">Deadline</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockAssignments.map((asn) => (
                <tr key={asn.id} onClick={() => setSelectedAssignment(asn)} className="hover:bg-gray-50 transition cursor-pointer group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{asn.courseTitle}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{asn.targetName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{asn.targetType} ({asn.traineeCount} members)</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{asn.deadline}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      asn.status === 'Active' ? 'bg-green-100 text-green-700' :
                      asn.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {asn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 group-hover:text-[#1a6b3c] transition p-1">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>Showing 1 to {mockAssignments.length} of {mockAssignments.length} assignments</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Prev</button>
            <button className="px-3 py-1 bg-[#1a6b3c] text-white rounded-lg shadow-sm">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Comprehensive Details Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#f0f7f3] text-[#1a6b3c] flex items-center justify-center font-bold text-lg shadow-sm border border-green-100">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 leading-tight">Assignment Details</h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{selectedAssignment.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAssignment(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Course Enrolled</p>
                <p className="font-bold text-lg text-[#1a6b3c]">{selectedAssignment.courseTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Assigned Target</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Target size={14} className="text-gray-400"/> {selectedAssignment.targetName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Trainees</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Users size={14} className="text-gray-400"/> {selectedAssignment.traineeCount} Members</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Instructors</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><UserCheck size={14} className="text-gray-400"/> {selectedAssignment.assignedTrainers.join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    selectedAssignment.status === 'Active' ? 'bg-green-100 text-green-700' : 
                    selectedAssignment.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedAssignment.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Assignment Deadline</p>
                  <p className="font-semibold text-red-600 flex items-center gap-1.5"><Calendar size={14}/> {selectedAssignment.deadline}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-gray-700">Overall Group Progress</span>
                  <span className="text-[#1a6b3c] font-bold">{selectedAssignment.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#1a6b3c] h-2.5 rounded-full transition-all duration-1000" style={{ width: `${selectedAssignment.progress}%` }}></div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex justify-center items-center gap-2">
                  Edit Assignment
                </button>
                <button className="flex-1 bg-[#1a6b3c] hover:bg-[#145530] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex justify-center items-center gap-2">
                  <AlertCircle size={16} /> Remind Trainees
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}