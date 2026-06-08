"use client";

import React from "react";
import { useState } from "react";

export default function EvaluationPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1a6b3c] mb-3">
          End-of-Course Evaluation
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          Please provide feedback about this course.
        </p>

        {!submitted ? (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                How useful was this course?
              </label>
              <select className="w-full border rounded-lg px-4 py-2">
                <option>Very useful</option>
                <option>Useful</option>
                <option>Not very useful</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Any comments?
              </label>
              <textarea
                className="w-full border rounded-lg px-4 py-2 h-32"
                placeholder="Write your feedback here..."
              />
            </div>

            <button
              onClick={() => setSubmitted(true)}
              className="bg-[#1a6b3c] text-white px-6 py-2 rounded-lg"
            >
              Submit Evaluation
            </button>
          </div>
        ) : (
          <div className="bg-[#f0f7f3] rounded-xl p-5 text-[#1a6b3c] font-semibold">
            Thank you. Your feedback has been submitted.
          </div>
        )}
      </div>
    </div>
  );
}