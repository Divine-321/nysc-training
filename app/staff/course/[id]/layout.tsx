"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";

const menuItems = [
  { label: "Introduction", id: "introduction" },
  { label: "Pre-Course Test", id: "pretest" },
  { label: "Course Material", id: "material" },
  { label: "Week 1: Digital Transformation", id: "week1" },
  { label: "Week 2: Navigating Cloud Tools", id: "week2" },
  { label: "Week 3: Mastering Spreadsheets", id: "week3" },
  { label: "Week 4: Data Cleaning", id: "week4" },
  { label: "Week 5: Intermediate Skills", id: "week5" },
  { label: "Revision Work: Full Course", id: "revision" },
  { label: "Post-Course Test", id: "posttest" },
  { label: "End-of-Course Evaluation", id: "evaluation" },
];

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("introduction");
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col">

      {/* GREEN HEADER */}
      <header className="h-16 bg-[#1a6b3c] flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <button
            onClick={() => router.push("/staff/training")}
            className="flex items-center gap-2 text-white hover:text-green-200 transition"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="w-px h-6 bg-green-500" />

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/images/nysc-logo.png" alt="NYSC" width={36} height={36} />
            <div>
              <p className="text-white font-bold text-base leading-none">NYSC</p>
              <p className="text-green-300 text-xs">STAFF E-TRAINING</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-white">
            <Bell size={20} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer">
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

        {/* COURSE SIDEBAR */}
        <aside className="w-48 bg-white fixed top-16 left-0 bottom-0 overflow-y-auto">
          <div className="px-4 py-3 bg-white sticky top-0">
            <p className="text-sm font-bold text-gray-800">Course Menu</p>
          </div>
          <nav>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveItem(item.id);
                  setExpanded(expanded === item.id ? null : item.id);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-left border-b border-gray-100 transition ${
                  activeItem === item.id
                    ? "bg-[#1a6b3c] text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="leading-snug">{item.label}</span>
                <span className="ml-1 shrink-0">▾</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT — passes activeItem down via context or search params */}
        <main className="ml-48 flex-1 bg-gray-50 min-h-screen">
          {/* Pass activeItem to children via a workaround */}
          <div data-active={activeItem} className="h-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}