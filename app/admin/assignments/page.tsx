"use client";

import { useState } from "react";
import { courses } from "@/app/data/courses";
import { cohorts, departments, staffUsers } from "@/app/data/adminData";

export default function AssignmentsPage() {
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || "");
  const [assignmentType, setAssignmentType] = useState<"staff" | "department" | "cohort" | "file-range">("staff");
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Manage Course Assignments</h2>
        <p className="text-sm text-gray-500">
          Assign trainers and target trainees to courses.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
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

        <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold transition">
          Assign Course
        </button>
      </div>
    </div>
  );
}