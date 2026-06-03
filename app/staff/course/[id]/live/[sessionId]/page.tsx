"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { courses } from "@/app/data/courses";
import { ArrowLeft, Mic, MicOff, Video, VideoOff, Share, MessageSquare, Users, PhoneOff } from "lucide-react";

export default function InAppLiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.id);
  const sessionId = String(params.sessionId);

  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const currentCourse = courses.find((c) => String(c.id) === courseId);
  const currentSession = currentCourse?.liveSessions?.find(
    (s) => String(s.id) === sessionId
  );

  if (!currentCourse || !currentSession) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-600">Session not found</h2>
          <Link href={`/staff/course/${courseId}/live`} className="text-[#1a6b3c] mt-4 inline-block font-medium">
            ← Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-900 text-white">
      {/* Top Header Bar */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/staff/course/${courseId}/live`)}
            className="text-gray-300 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg">{currentSession.title}</h1>
            <p className="text-gray-400 text-xs">In-App Live Session Prototype</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-xs font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Recording
          </span>
          <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 tracking-wider shadow-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            LIVE
          </div>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="flex-1 p-6 flex items-center justify-center relative">
        <div className="w-full max-w-5xl aspect-video bg-gray-950 rounded-2xl border border-gray-700 overflow-hidden relative shadow-2xl flex items-center justify-center">
          <div className="text-center">
            <Users size={64} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Waiting for instructor to share screen...</p>
          </div>
          
          {/* Self Video PIP (Picture in Picture) */}
          <div className="absolute bottom-6 right-6 w-48 aspect-video bg-gray-800 rounded-xl border-2 border-gray-600 flex items-center justify-center overflow-hidden shadow-lg">
            {isCameraOn ? (
              <p className="text-gray-400 text-xs">Camera Feed Active</p>
            ) : (
              <p className="text-gray-500 text-xs">Camera Disabled</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="bg-gray-800 py-5 px-6 flex justify-center items-center gap-4 shadow-lg border-t border-gray-700">
        <button onClick={() => setIsMicOn(!isMicOn)} className={`p-4 rounded-full flex items-center justify-center transition ${isMicOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button onClick={() => setIsCameraOn(!isCameraOn)} className={`p-4 rounded-full flex items-center justify-center transition ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
          {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
        <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition hidden sm:flex">
          <Share size={24} />
        </button>
        <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition hidden sm:flex">
          <MessageSquare size={24} />
        </button>
        <button onClick={() => router.push(`/staff/course/${courseId}/live`)} className="px-6 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold transition ml-4 sm:ml-8 gap-2">
          <PhoneOff size={20} />
          Leave Meeting
        </button>
      </div>
    </div>
  );
}