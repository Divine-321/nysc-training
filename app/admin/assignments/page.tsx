import { courses } from "@/app/data/courses";
import { cohorts, departments, staffUsers } from "@/app/data/adminData";

export default function AssignmentsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Assign Course</h2>
        <p className="text-sm text-gray-500">
          Assign courses to staff, departments, or cohorts.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <select className="w-full border rounded-lg px-4 py-3">
          {courses.map((course) => (
            <option key={course.id}>{course.title}</option>
          ))}
        </select>

        <select className="w-full border rounded-lg px-4 py-3">
          <option>Individual Staff</option>
          <option>Department</option>
          <option>Cohort</option>
        </select>

        <select className="w-full border rounded-lg px-4 py-3">
          <optgroup label="Staff">
            {staffUsers.map((staff) => (
              <option key={staff.id}>{staff.name}</option>
            ))}
          </optgroup>

          <optgroup label="Departments">
            {departments.map((dept) => (
              <option key={dept.id}>{dept.name}</option>
            ))}
          </optgroup>

          <optgroup label="Cohorts">
            {cohorts.map((cohort) => (
              <option key={cohort.id}>{cohort.name}</option>
            ))}
          </optgroup>
        </select>

        <input type="date" className="w-full border rounded-lg px-4 py-3" />

        <button className="bg-[#1a6b3c] text-white px-6 py-3 rounded-lg">
          Assign Course
        </button>
      </div>
    </div>
  );
}