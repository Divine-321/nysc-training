"use client";

import { useState } from "react";
import Image from "next/image";

const menuSections = [
  "introduction",
  "pretest",
  "material",
  "week1",
  "week2",
  "week3",
  "week4",
  "week5",
  "revision",
  "posttest",
  "evaluation",
];

const instructors = [
  { name: "Sulaiman", initial: "S", color: "bg-[#1a6b3c]" },
  { name: "Nasir", initial: "N", color: "bg-blue-600" },
  { name: "Favour", initial: "F", color: "bg-orange-500" },
];

export default function CourseContentPage() {
  const [activeSection, setActiveSection] = useState("introduction");

  return (
    <div className="p-6">

      {/* MINI NAV — mirrors sidebar but inside content for now */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: "introduction", label: "Introduction" },
          { id: "pretest", label: "Pre-Course Test" },
          { id: "material", label: "Course Material" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
              activeSection === item.id
                ? "bg-[#1a6b3c] text-white border-[#1a6b3c]"
                : "text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* INTRODUCTION */}
      {activeSection === "introduction" && (
        <div>
          <div className="relative rounded-xl overflow-hidden mb-6">
            <Image
              src="/images/course-hero.png"
              alt="Course Hero"
              width={1200}
              height={400}
              className="w-full h-72 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-6">
              <p className="text-white text-sm font-medium">
                Technology Training | Target: NYSC Permanent Staff
              </p>
              <div>
                <h2 className="text-white text-xl font-bold mb-3">
                  Course Introduction: Digital Literacy & Information Security
                </h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {instructors.map((inst) => (
                      <div key={inst.name} className="flex items-center gap-1">
                        <div className={`w-7 h-7 rounded-full ${inst.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {inst.initial}
                        </div>
                        <span className="text-white text-sm">{inst.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-white text-xs mb-1">70% Courses Completed</p>
                      <div className="w-40 bg-white/30 rounded-full h-1.5">
                        <div className="bg-white h-1.5 rounded-full" style={{ width: "70%" }} />
                      </div>
                    </div>
                    <button className="border border-white text-white text-xs px-3 py-1.5 rounded">
                      Resume
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#f0f7f3] rounded-xl p-6 text-sm text-gray-700 leading-relaxed">
            <p className="mb-3">
              Welcome to the Digital Literacy & Information Security training portal.
              As an NYSC officer, you manage the data, logistics, and deployment details
              of thousands of graduates across Nigeria. Transitioning from paper-based
              registries to secure digital workflows isn&apos;t just about speed — it is
              about safeguarding national data and ensuring operational integrity.
            </p>
            <p>
              This 5-week course equips you with the modern productivity tools and
              cybersecurity habits required to run seamless, paperless operations at
              state secretariats and orientation camps.
            </p>
          </div>
        </div>
      )}

      {/* PRE COURSE TEST */}
      {activeSection === "pretest" && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Pre Course Test (Ungraded)
          </h2>
          <div className="w-full h-px bg-gray-300 mb-6" />
          <div className="bg-[#e8f5ee] rounded-xl p-6 text-sm text-gray-700 max-w-3xl">
            <p className="mb-3 font-medium">Please read the instructions below carefully.</p>
            <p className="mb-3">
              This baseline assessment evaluates your current awareness to tailor
              the upcoming training to your skill level.
            </p>
            <p className="font-semibold mb-3">Test Instructions</p>
            <ul className="space-y-2 mb-6">
              {[
                "You have exactly 1 attempt to complete this assessment.",
                "Answer all questions steadily, your score will be recorded immediately upon completion.",
                "Complete the test independently without using search engines or consulting colleagues.",
                "Read the feedback provided after submitting your answers to identify areas for improvement.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="border-2 border-[#1a6b3c] text-[#1a6b3c] font-semibold px-6 py-2 rounded hover:bg-[#1a6b3c] hover:text-white transition">
              Attempt
            </button>
          </div>
        </div>
      )}

      {/* COURSE MATERIAL + WEEKS — placeholder */}
      {activeSection === "material" && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1a6b3c]">Course Material</h2>
          <p className="text-gray-400 text-sm mt-2">Materials will appear here.</p>
        </div>
      )}

    </div>
  );
}