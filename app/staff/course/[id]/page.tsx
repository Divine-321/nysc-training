"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PlayCircle,
  UserCheck,
} from "lucide-react";
import {
  documentIsComplete,
  loadAssessments,
  loadStaffCourse,
  toPercentage,
  type Assessment,
  type StaffCourse,
} from "@/app/lib/staff-learning";

function trainerLabel(staffCourse: StaffCourse) {
  const trainers = staffCourse.course?.trainers ?? [];

  if (trainers.length === 0) return "Trainer not assigned";

  return trainers.map((trainer) => trainer.full_name).join(", ");
}

function AssessmentCard({
  assessment,
  courseId,
  type,
}: {
  assessment: Assessment;
  courseId: number;
  type: "pre-test" | "post-test";
}) {
  const isPreTest = type === "pre-test";

  return (
    <Link
      href={`/staff/course/${courseId}/assessment/${type}`}
      className="block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#1a6b3c]"
    >
      <ClipboardCheck className="mb-3 text-[#1a6b3c]" size={28} />
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1a6b3c]">
        {isPreTest ? "Before modules" : "After modules"}
      </p>
      <h3 className="mt-1 font-bold text-gray-800">{assessment.title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {isPreTest
          ? "Attempt the pre-course assessment before starting the modules."
          : "Attempt the post-course assessment after completing the modules."}
      </p>
    </Link>
  );
}

export default function CourseOverviewPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, assessmentData] = await Promise.all([
          loadStaffCourse(courseId),
          loadAssessments(courseId).catch(() => []),
        ]);

        setStaffCourse(courseData);
        setAssessments(assessmentData);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this course.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [courseId]);

  const totalDocuments = useMemo(
    () =>
      staffCourse?.modules.reduce(
        (total, module) => total + module.documents.length,
        0,
      ) ?? 0,
    [staffCourse?.modules],
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-gray-800">Loading course...</h2>
        </div>
      </div>
    );
  }

  if (error || !staffCourse) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-red-600">
            Course not available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {error || "This course is not assigned to you."}
          </p>
        </div>
      </div>
    );
  }

  const progress = toPercentage(staffCourse.enrollment.completion_percentage);
  const firstModule = staffCourse.modules[0];
  const preTest = assessments.find((assessment) => assessment.type === "PRE_TEST");
  const postTest = assessments.find(
    (assessment) => assessment.type === "POST_TEST",
  );
  const trainers = staffCourse.course?.trainers ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="relative min-h-72 overflow-hidden rounded-xl bg-[#1a6b3c]">
        {staffCourse.course?.thumbnail_url && (
          <Image
            src={staffCourse.course.thumbnail_url}
            alt={staffCourse.enrollment.course_title}
            width={1200}
            height={400}
            className="h-72 w-full object-cover opacity-80"
          />
        )}

        <div className="absolute inset-0 flex flex-col justify-end bg-black/35 p-6">
          <p className="text-sm font-medium text-green-100">
            {staffCourse.course?.category_name || "Training"} |{" "}
            {staffCourse.enrollment.cohort_name}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white">
            {staffCourse.enrollment.course_title}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-green-50">
            <UserCheck size={16} />
            {trainers.length === 1 ? "Trainer:" : "Trainers:"}{" "}
            {trainerLabel(staffCourse)}
          </p>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-white">
              <span className="rounded-full bg-white/20 px-3 py-1">
                {staffCourse.modules.length} module(s)
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1">
                {totalDocuments} material(s)
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1">
                {progress}% materials complete
              </span>
            </div>

            {firstModule && (
              <Link
                href={`/staff/course/${courseId}/module/${firstModule.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[#1a6b3c]"
              >
                <PlayCircle size={17} />
                {progress > 0 ? "Resume" : "Start learning"}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#f0f7f3] p-6 text-sm leading-relaxed text-gray-700">
        <p className="mb-3">
          {staffCourse.course?.description ||
            "Complete the uploaded module materials, take the tests, and submit your course evaluation."}
        </p>
        <div className="mb-3 rounded-lg bg-white/70 p-4">
          <p className="mb-2 flex items-center gap-2 font-bold text-gray-800">
            <UserCheck size={17} className="text-[#1a6b3c]" />
            Course {trainers.length === 1 ? "Trainer" : "Trainers"}
          </p>
          {trainers.length === 0 ? (
            <p className="text-gray-500">Trainer not assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {trainers.map((trainer) => (
                <div key={trainer.id}>
                  <p className="font-semibold text-gray-800">
                    {trainer.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {trainer.designation}
                    {trainer.organization ? ` • ${trainer.organization}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <p>
          Material progress updates when you mark uploaded documents as
          completed. Tests and evaluation may still be required before your
          certificate is issued.
        </p>
      </div>

      {preTest && (
        <AssessmentCard
          assessment={preTest}
          courseId={courseId}
          type="pre-test"
        />
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
          <BookOpen size={20} className="text-[#1a6b3c]" />
          Course Modules
        </h3>

        {staffCourse.modules.length === 0 ? (
          <p className="text-sm text-gray-400">
            No modules have been added to this course yet.
          </p>
        ) : (
          <div className="space-y-3">
            {staffCourse.modules.map((module) => {
              const completedDocuments = module.documents.filter((document) =>
                documentIsComplete(staffCourse.enrollment, document.id),
              ).length;

              return (
                <Link
                  key={module.id}
                  href={`/staff/course/${courseId}/module/${module.id}`}
                  className="block rounded-lg border p-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {module.title}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {module.description || "No description"}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FileText size={13} />
                        {completedDocuments} of {module.documents.length}{" "}
                        material(s) completed
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        module.documents.length > 0 &&
                        completedDocuments === module.documents.length
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {module.documents.length > 0 &&
                      completedDocuments === module.documents.length ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          Done
                        </span>
                      ) : (
                        "Pending"
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {postTest && (
        <AssessmentCard
          assessment={postTest}
          courseId={courseId}
          type="post-test"
        />
      )}
    </div>
  );
}
