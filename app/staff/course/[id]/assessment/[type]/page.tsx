"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { questions } from "@/app/data/courses";

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();

  const assessmentType = params.type === "post-test" ? "Post-Course Test" : "Pre-Course Test";

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const question = questions[currentQuestion];
  const score = questions.filter((q) => answers[q.id] === q.answer).length;
  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#eeeeee]">
      <div className="grid grid-cols-[1fr_260px] min-h-screen">
        <main className="px-16 py-14">
          <h2 className="text-2xl font-medium text-black mb-8">
            {assessmentType}
          </h2>

          <div className="bg-white min-h-[520px] p-8">
            <button
              onClick={() => router.back()}
              className="border border-gray-900 px-4 py-2 rounded-md mb-8 hover:bg-gray-100"
            >
              Back
            </button>

            {!submitted ? (
              <div className="grid grid-cols-[170px_1fr] gap-8">
                <aside className="bg-[#d8eee2] border border-gray-800 p-4 h-fit">
                  <h3 className="text-2xl font-semibold mb-4">
                    Question {currentQuestion + 1}
                  </h3>

                  <p className="text-sm text-gray-700 mb-4">
                    {answers[question.id] === undefined
                      ? "Not yet answered"
                      : "Answered"}
                  </p>

                  <p className="text-sm text-gray-700 mb-4">Marked out of 1</p>
                </aside>

                <section className="border border-gray-400 p-6 max-w-2xl">
                  <p className="text-sm text-gray-900 mb-10">
                    {question.question}
                  </p>

                  <p className="text-sm mb-3">Select one:</p>

                  <div className="space-y-4">
                    {question.options.map((option, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-3 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={answers[question.id] === index}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: index,
                            }))
                          }
                          className="mt-1"
                        />

                        <span>
                          <span className="mr-2">
                            {String.fromCharCode(97 + index)}.
                          </span>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-between mt-10">
                    <button
                      disabled={currentQuestion === 0}
                      onClick={() => setCurrentQuestion((prev) => prev - 1)}
                      className="px-5 py-2 border rounded disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {currentQuestion < questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuestion((prev) => prev + 1)}
                        className="px-5 py-2 bg-[#079447] text-white rounded"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={() => setSubmitted(true)}
                        className="px-5 py-2 bg-[#079447] text-white rounded"
                      >
                        Finish attempt
                      </button>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="max-w-xl bg-[#f0f7f3] p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-[#1a6b3c] mb-3">
                  Assessment Submitted
                </h3>

                <p className="text-gray-700 mb-2">
                  You scored <b>{score}</b> out of <b>{questions.length}</b>.
                </p>

                <p className="text-gray-700 mb-6">
                  Percentage: {percentage}%
                </p>

                <button
                  onClick={() => router.push("/staff/result")}
                  className="bg-[#1a6b3c] text-white px-6 py-2 rounded"
                >
                  View Result
                </button>
              </div>
            )}
          </div>
        </main>

        <aside className="bg-white px-6 py-10">
          <h3 className="text-lg font-medium mb-3">Quiz navigation</h3>

          <div className="flex gap-2 mb-5">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-7 h-7 border text-sm ${
                  currentQuestion === index
                    ? "bg-[#1a6b3c] text-white"
                    : answers[q.id] !== undefined
                    ? "bg-[#d8eee2]"
                    : "bg-white"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSubmitted(true)}
            className="border-2 border-[#079447] text-[#079447] font-semibold px-8 py-2 rounded-md hover:bg-[#079447] hover:text-white transition"
          >
            Submit
          </button>
        </aside>
      </div>
    </div>
  );
}