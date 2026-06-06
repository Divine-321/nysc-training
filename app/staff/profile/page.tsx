"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Briefcase, Hash, BookOpen, ShieldCheck, Phone, Mail, Edit2, Save, X, Camera } from "lucide-react";

export default function StaffProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  // Mock Staff Data based on your requested fields
  const [staffData, setStaffData] = useState({
    photo: "/1-blank-profile.png",
    fileNo: "NYSC/STF/2026/045",
    surname: "ABBA",
    otherNames: "Sulaiman Nasir",
    rank: "Senior Inspector",
    gradeLevel: "GL 09",
    location: "National Directorate Headquarters, Abuja",
    coursesAttended: 4,
    status: "Active",
    phone: "+234 800 123 4567",
    email: "sulaiman.abba@nysc.gov.ng",
  });

  const [formData, setFormData] = useState({ ...staffData });

  const handleSave = () => {
    setStaffData({ ...formData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({ ...staffData });
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Staff Profile</h2>
        <p className="text-sm text-gray-500">View your official NYSC personnel details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photo, Name, Rank & Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full border-4 border-[#f0f7f3] overflow-hidden mb-4 relative bg-gray-100 shadow-sm group">
            <Image 
              src={staffData.photo} 
              alt={`${staffData.surname} Photo`} 
              fill 
              className="object-cover" 
            />
            {isEditing && (
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition">
                <Camera size={24} />
                <span className="text-xs mt-1 font-medium">Change</span>
                <input type="file" className="hidden" accept="image/*" />
              </label>
            )}
          </div>
          
          {isEditing ? (
            <div className="w-full space-y-3 mt-2">
              <div className="flex justify-center mb-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 ${staffData.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {staffData.status === 'Active' && <ShieldCheck size={14} />}
                  {staffData.status}
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 text-left mb-1">Surname</label>
                <input 
                  type="text" 
                  name="surname" 
                  value={formData.surname} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 text-left mb-1">Other Names</label>
                <input 
                  type="text" 
                  name="otherNames" 
                  value={formData.otherNames} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
              </div>
              <div className="pt-2">
                <p className="text-[#1a6b3c] font-bold text-sm">{staffData.rank}</p>
              </div>
            </div>
          ) : (
            <>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm flex items-center gap-1 ${staffData.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {staffData.status === 'Active' && <ShieldCheck size={14} />}
                {staffData.status}
              </span>
              <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">{staffData.surname}</h3>
              <p className="text-gray-600 font-medium mb-1">{staffData.otherNames}</p>
              <p className="text-[#1a6b3c] font-bold text-sm mt-2">{staffData.rank}</p>
            </>
          )}
        </div>

        {/* Right Column: Detailed Official Information */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-800">Official Information</h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-[#1a6b3c] flex items-center gap-1 hover:underline"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCancel}
                  className="text-sm font-semibold text-gray-500 flex items-center gap-1 hover:underline bg-gray-50 px-3 py-1.5 rounded-lg transition"
                >
                  <X size={16} /> Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="text-sm font-semibold text-white flex items-center gap-1 bg-[#1a6b3c] hover:bg-[#145530] px-3 py-1.5 rounded-lg transition"
                >
                  <Save size={16} /> Save
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8">
            {/* Email (Editable) */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 border border-gray-100">
                <Mail size={20} />
              </div>
              <div className="flex flex-col justify-center w-full">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                {isEditing ? (
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                ) : (
                  <p className="font-bold text-gray-800 truncate">{staffData.email}</p>
                )}
              </div>
            </div>

            {/* Phone (Editable) */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 border border-gray-100">
                <Phone size={20} />
              </div>
              <div className="flex flex-col justify-center w-full">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                {isEditing ? (
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                ) : (
                  <p className="font-bold text-gray-800">{staffData.phone}</p>
                )}
              </div>
            </div>

            {/* Read-Only Official Details */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 border border-gray-100">
                <Hash size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">File No</p>
                <p className="font-bold text-gray-800">{staffData.fileNo}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 border border-gray-100">
                <Briefcase size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grade Level</p>
                <p className="font-bold text-gray-800">{staffData.gradeLevel}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 border border-gray-100">
                <MapPin size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                <p className="font-bold text-gray-800">{staffData.location}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <BookOpen size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Courses Attended</p>
                <p className="font-extrabold text-blue-700 text-lg leading-none">{staffData.coursesAttended}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}