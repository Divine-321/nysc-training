"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { questions } from "@/app/data/courses";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, AlertCircle } from "lucide-react";

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

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row min-h-screen">
        <main className="flex-1 px-6 py-10 lg:px-12 lg:py-14 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a6b3c] transition font-medium"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {assessmentType}
              </h2>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[520px] p-6 lg:p-10">
              {!submitted ? (
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                  <aside className="w-full md:w-48 shrink-0">
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                        Question
                      </p>
                      <h3 className="text-3xl font-bold text-[#1a6b3c] mb-4">
                        {currentQuestion + 1} <span className="text-lg text-gray-400">/ {questions.length}</span>
                      </h3>

                      <div className={`flex items-center gap-2 text-sm font-medium ${answers[question.id] !== undefined ? 'text-green-600' : 'text-amber-500'}`}>
                        {answers[question.id] !== undefined ? (
                          <><CheckCircle2 size={16} /> Answered</>
                        ) : (
                          <><HelpCircle size={16} /> Pending</>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 font-medium">Points: 1.00</p>
                      </div>
                    </div>
                  </aside>

                  <section className="flex-1 max-w-2xl">
                    <h4 className="text-lg text-gray-800 font-medium mb-8 leading-relaxed">
                      {question.question}
                    </h4>

                    <div className="space-y-3 mb-10">
                      {question.options.map((option, index) => {
                        const isSelected = answers[question.id] === index;
                        return (
                          <label
                            key={index}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                              isSelected 
                                ? "border-[#1a6b3c] bg-green-50" 
                                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#1a6b3c]" : "border-gray-300"
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-[#1a6b3c] rounded-full" />}
                            </div>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={isSelected}
                              onChange={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [question.id]: index,
                                }))
                              }
                              className="hidden"
                            />
                            <span className={`text-sm ${isSelected ? "text-[#1a6b3c] font-medium" : "text-gray-700"}`}>
                              <span className="mr-3 font-semibold text-gray-400">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              {option}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                      <button
                        disabled={currentQuestion === 0}
                        onClick={() => setCurrentQuestion((prev) => prev - 1)}
                        className="px-5 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg disabled:opacity-40 flex items-center gap-2 hover:bg-gray-50 transition"
                      >
                        <ChevronLeft size={18} /> Previous
                      </button>

                      {currentQuestion < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentQuestion((prev) => prev + 1)}
                          className="px-6 py-2.5 bg-[#1a6b3c] hover:bg-[#145530] text-white font-medium rounded-lg flex items-center gap-2 transition"
                        >
                          Next <ChevronRight size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setSubmitted(true)}
                          className={`px-6 py-2.5 text-white font-medium rounded-lg flex items-center gap-2 transition ${
                            allAnswered ? "bg-[#1a6b3c] hover:bg-[#145530]" : "bg-amber-500 hover:bg-amber-600"
                          }`}
                        >
                          {allAnswered ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                          Finish Attempt
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="max-w-xl mx-auto py-8">
                  <div className="bg-[#f0f7f3] p-8 rounded-2xl border border-green-100 text-center">
                    <div className="w-16 h-16 bg-green-100 text-[#1a6b3c] rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-[#1a6b3c] mb-2">
                      Assessment Submitted
                    </h3>
                    <p className="text-gray-600 mb-8">
                      You have successfully completed the {assessmentType.toLowerCase()}.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-green-50">
                        <p className="text-sm text-gray-500 font-medium mb-1">Score</p>
                        <p className="text-2xl font-bold text-gray-800">{score} <span className="text-base text-gray-400 font-normal">/ {questions.length}</span></p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-green-50">
                        <p className="text-sm text-gray-500 font-medium mb-1">Percentage</p>
                        <p className={`text-2xl font-bold ${percentage >= 50 ? 'text-[#1a6b3c]' : 'text-red-500'}`}>
                          {percentage}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push("/staff/result")}
                      className="w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm"
                    >
                      View Detailed Result
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {!submitted && (
          <aside className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-6 lg:py-14 flex flex-col h-auto lg:h-screen lg:sticky top-0 shrink-0">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Quiz Navigation</h3>

            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 mb-8">
              {questions.map((q, index) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = currentQuestion === index;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(index)}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                      isCurrent
                        ? "bg-[#1a6b3c] text-white ring-2 ring-[#1a6b3c] ring-offset-2"
                        : isAnswered
                        ? "bg-green-100 text-[#1a6b3c] border border-green-200 hover:bg-green-200"
                        : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200 shrink-0" /> Answered
                <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200 shrink-0 ml-2" /> Pending
              </div>

              <button
                onClick={() => setSubmitted(true)}
                className="w-full border-2 border-[#1a6b3c] text-[#1a6b3c] font-bold px-6 py-3 rounded-xl hover:bg-[#1a6b3c] hover:text-white transition"
              >
                Submit Attempt
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}