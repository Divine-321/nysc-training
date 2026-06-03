"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const mockQuestions = [
  { id: 1, text: "What is the primary mandate of the National Youth Service Corps (NYSC)?", options: ["Military Training", "National Unity and Integration", "Political Campaigning", "Tax Collection"] },
  { id: 2, text: "How long is the mandatory NYSC service year?", options: ["6 months", "12 months", "18 months", "24 months"] },
  { id: 3, text: "During the orientation camp, which of the following is strictly prohibited?", options: ["Morning drills", "Wearing the NYSC uniform", "Unauthroized exits from the camp", "Attending SAED lectures"] },
  { id: 4, text: "Who is the Chief Executive Officer of the NYSC at the National level?", options: ["The President", "The State Governor", "The Director-General", "The Local Government Inspector"] },
  { id: 5, text: "Which department is responsible for issuing clearance certificates to corps members?", options: ["Skill Acquisition", "Corps Certification", "Camp Court", "Community Development Service (CDS)"] },
];

export default function ExamSessionPage() {
  const params = useParams();
  const router = useRouter();
  const examId = String(params.id);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isSubmitted) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers({ ...answers, [currentQuestion]: optionIndex });
  };

  const handleSubmit = () => {
    if (confirm("Are you sure you want to submit your examination? You cannot undo this action.")) {
      setIsSubmitted(true);
    }
  };

  const activeQuestion = mockQuestions[currentQuestion];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 max-w-md w-full flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-[#1a6b3c] mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Examination Submitted!</h2>
          <p className="text-gray-500 mb-8">Your answers for {examId} have been recorded successfully. Your results will be published shortly.</p>
          <button 
            onClick={() => router.push('/staff/cbt')}
            className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-8 py-3 rounded-xl font-bold transition w-full"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Exam Header */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a6b3c] rounded flex items-center justify-center text-white font-bold text-xs">
            CBT
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">Public Administration Final Exam</h1>
            <p className="text-xs text-gray-500 font-medium">Exam ID: {examId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
            <Clock size={16} />
            <span className="tabular-nums tracking-widest">{formatTime(timeLeft)}</span>
          </div>
          <button 
            onClick={handleSubmit}
            className="bg-gray-900 hover:bg-black text-white px-5 py-1.5 rounded-lg text-sm font-bold transition"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Question Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex-1">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold text-[#1a6b3c] uppercase tracking-wider">Question {currentQuestion + 1} of {mockQuestions.length}</span>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md">2 Marks</span>
            </div>
            
            <h2 className="text-xl font-medium text-gray-800 mb-8 leading-relaxed">
              {activeQuestion.text}
            </h2>
            
            <div className="space-y-3">
              {activeQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition ${
                      isSelected 
                        ? 'border-[#1a6b3c] bg-[#f0f7f3]' 
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#1a6b3c]' : 'border-gray-300'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-[#1a6b3c] rounded-full" />}
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-[#1a6b3c]' : 'text-gray-700'}`}>{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition"
            >
              <ChevronLeft size={20} /> Previous
            </button>
            <button 
              onClick={() => setCurrentQuestion(Math.min(mockQuestions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === mockQuestions.length - 1}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Next <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Right Column: Question Navigator */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
          <h3 className="font-bold text-gray-800 mb-4">Question Map</h3>
          <div className="grid grid-cols-5 gap-2">
            {mockQuestions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm font-bold border transition ${
                  currentQuestion === idx 
                    ? 'border-gray-900 bg-gray-900 text-white' 
                    : answers[idx] !== undefined 
                      ? 'border-[#1a6b3c] bg-[#1a6b3c] text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          
          <div className="mt-8 space-y-3 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-4 h-4 bg-[#1a6b3c] rounded-sm shrink-0" /> Answered
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded-sm shrink-0" /> Unanswered
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-4 h-4 bg-gray-900 rounded-sm shrink-0" /> Current Question
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}