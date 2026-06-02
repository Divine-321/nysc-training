"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { courses } from "@/app/data/courses";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const courseId = params.id;

  const currentCourse = courses.find(
  (course) => String(course.id) === String(courseId)
);

if (!currentCourse) {
  return <div className="p-6">Course not found</div>;
}

  const menuItems = [
    { label: "Course Overview", href: `/staff/course/${courseId}` },

    ...(currentCourse.hasPreTest
      ? [{ label: "Pre-Course Test", href: `/staff/course/${courseId}/assessment/pre-test` }]
      : []),

    ...currentCourse.modules.map((module) => ({
      label: module.title,
      href: `/staff/course/${courseId}/module/${module.id}`,
    })),

    ...(currentCourse.hasPostTest
      ? [{ label: "Post-Course Test", href: `/staff/course/${courseId}/assessment/post-test` }]
      : []),

    ...(currentCourse.hasEvaluation
      ? [{ label: "Evaluation", href: `/staff/course/${courseId}/evaluation` }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 bg-[#1a6b3c] flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/staff/training")}
            className="flex items-center gap-2 text-white hover:text-green-200 transition"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="w-px h-6 bg-green-500" />

          <div className="flex items-center gap-2">
            <Image src="/images/nysc-logo.png" alt="NYSC" width={36} height={36} />
            <div>
              <p className="text-white font-bold text-base leading-none">NYSC</p>
              <p className="text-green-300 text-xs">STAFF E-TRAINING</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Bell size={20} className="text-white" />
          <div className="flex items-center gap-2">
            <Image
              src="/images/user-avatar.png"
              alt="User"
              width={34}
              height={34}
              className="rounded-full object-cover"
            />
            <span className="text-white text-sm font-medium">User ▾</span>
          </div>
        </div>
      </header>

      <div className="flex pt-16 min-h-screen">
        <aside className="w-56 bg-white fixed top-16 left-0 bottom-0 overflow-y-auto">
          <div className="px-4 py-3 sticky top-0 bg-white border-b">
            <p className="text-sm font-bold text-gray-800">Course Menu</p>
          </div>

          <nav>
            {menuItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 text-xs font-medium border-b border-gray-100 transition ${
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

        <main className="ml-56 flex-1 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}