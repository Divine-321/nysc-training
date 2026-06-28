"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Menu, X } from "lucide-react";
import {
  loadAssessments,
  loadStaffCourse,
  type Assessment,
  type StaffCourse,
} from "@/app/lib/staff-learning";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const courseId = Number(params.id);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isLiveSession = Boolean(params.sessionId);
  const isAssessment = pathname?.includes("/assessment/") ?? false;
  const hideSidebar = isLiveSession || isAssessment;

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, assessmentData] = await Promise.all([
          loadStaffCourse(courseId),
          loadAssessments(courseId).catch(() => []),
        ]);

        setStaffCourse(courseData);
        setAssessments(assessmentData);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [courseId]);

  const menuItems = useMemo(() => {
    const hasPreTest = assessments.some(
      (assessment) => assessment.type === "PRE_TEST",
    );
    const hasPostTest = assessments.some(
      (assessment) => assessment.type === "POST_TEST",
    );

    return [
      { label: "Course Overview", href: `/staff/course/${courseId}` },
      ...(hasPreTest
        ? [
            {
              label: "Pre-Course Test",
              href: `/staff/course/${courseId}/assessment/pre-test`,
            },
          ]
        : []),
      ...(staffCourse?.modules ?? []).map((module) => ({
        label: module.title,
        href: `/staff/course/${courseId}/module/${module.id}`,
      })),
      ...(hasPostTest
        ? [
            {
              label: "Post-Course Test",
              href: `/staff/course/${courseId}/assessment/post-test`,
            },
          ]
        : []),
      { label: "Live Sessions", href: `/staff/course/${courseId}/live` },
      { label: "Evaluation", href: `/staff/course/${courseId}/evaluation` },
    ];
  }, [assessments, courseId, staffCourse?.modules]);

  if (loading) {
    return <div className="p-6">Loading course...</div>;
  }

  if (!staffCourse) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-red-600">
            Course not available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            This course is not currently assigned to your account.
          </p>
          <button
            onClick={() => router.push("/staff/training")}
            className="mt-4 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to my courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-[#1a6b3c] px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {!hideSidebar && (
            <button
              type="button"
              aria-label={isSidebarOpen ? "Close course menu" : "Open course menu"}
              onClick={() => setIsSidebarOpen((current) => !current)}
              className="rounded-lg p-2 text-white transition hover:bg-white/10 lg:hidden"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <button
            onClick={() => router.push("/staff/training")}
            className="flex items-center gap-2 text-white transition hover:text-green-200"
          >
            <ArrowLeft size={20} />
            <span className="hidden text-sm font-medium sm:inline">Back</span>
          </button>

          <div className="hidden h-6 w-px bg-green-500 sm:block" />

          <div className="hidden items-center gap-2 sm:flex">
            <Image
              src="/images/nysc-logo.png"
              alt="NYSC"
              width={36}
              height={36}
            />
            <div>
              <p className="text-base font-bold leading-none text-white">NYSC</p>
              <p className="text-xs text-green-300">STAFF E-TRAINING</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Bell size={20} className="shrink-0 text-white" />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-white">
              {staffCourse.enrollment.course_title}
            </p>
            <p className="text-xs text-green-200">
              Cohort: {staffCourse.enrollment.cohort_name}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen pt-16">
        {!hideSidebar && (
          <>
            {isSidebarOpen && (
              <div
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 top-16 z-40 bg-black/40 transition-opacity lg:hidden"
              />
            )}

            <aside
              className={`fixed bottom-0 left-0 top-16 z-50 w-64 overflow-y-auto bg-white shadow-xl transition-transform duration-300 ease-in-out lg:w-56 lg:translate-x-0 lg:shadow-none ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="sticky top-0 border-b bg-white px-4 py-3">
                <p className="text-sm font-bold text-gray-800">Course Menu</p>
              </div>

              <nav>
                {menuItems.map((item) => {
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block border-b border-gray-100 px-4 py-3 text-xs font-medium transition ${
                        active
                          ? "bg-[#1a6b3c] text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        <main
          className={`${hideSidebar ? "" : "lg:ml-56"} min-h-screen flex-1 bg-gray-50`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
