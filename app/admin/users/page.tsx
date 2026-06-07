"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Filter, Plus, MoreHorizontal, X, MapPin, Briefcase, BookOpen, ShieldCheck, Hash } from "lucide-react";

const mockStaff = [
  {
    id: "STF-001",
    photo: "/1-blank-profile.png",
    fileNo: "NYSC/STF/2026/045",
    surname: "ABBA",
    otherNames: "Sulaiman Nasir",
    rank: "Senior Inspector",
    gradeLevel: "GL 09",
    location: "National Directorate Headquarters, Abuja",
    coursesAttended: 4,
    status: "Active",
  },
  {
    id: "STF-002",
    photo: "/1-blank-profile.png",
    fileNo: "NYSC/STF/2025/112",
    surname: "NWACHUKWU",
    otherNames: "Favour",
    rank: "Principal Inspector",
    gradeLevel: "GL 12",
    location: "Lagos State Secretariat",
    coursesAttended: 7,
    status: "Active",
  },
  {
    id: "STF-003",
    photo: "/1-blank-profile.png",
    fileNo: "NYSC/STF/2020/088",
    surname: "ADEBAYO",
    otherNames: "Chukwudi",
    rank: "Chief Inspector",
    gradeLevel: "GL 14",
    location: "Oyo State Secretariat",
    coursesAttended: 12,
    status: "Retired",
  },
  {
    id: "STF-004",
    photo: "/1-blank-profile.png",
    fileNo: "NYSC/STF/2023/201",
    surname: "MOHAMMED",
    otherNames: "Aisha",
    rank: "Inspector II",
    gradeLevel: "GL 08",
    location: "Kano State Secretariat",
    coursesAttended: 2,
    status: "Active",
  },
  {
    id: "STF-005",
    photo: "/1-blank-profile.png",
    fileNo: "NYSC/STF/2018/015",
    surname: "OKONKWO",
    otherNames: "Ngozi",
    rank: "Assistant Director",
    gradeLevel: "GL 15",
    location: "Enugu State Secretariat",
    coursesAttended: 15,
    status: "Active",
  },
];

type StaffUser = typeof mockStaff[0];

export default function AdminUsersPage() {
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Staff</h2>
          <p className="text-sm text-gray-500 mt-1">View staff directory and personnel details.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff by name or file no..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Staff Member</th>
                <th className="px-6 py-4 font-medium">File No</th>
                <th className="px-6 py-4 font-medium">Rank & GL</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Courses</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {mockStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50 transition group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Image src={staff.photo} alt={staff.surname} width={36} height={36} className="rounded-full bg-gray-100 object-cover" />
                      <div>
                        <p className="font-semibold text-gray-800 uppercase tracking-tight">{staff.surname}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{staff.otherNames}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{staff.fileNo}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{staff.rank}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{staff.gradeLevel}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[12rem]">{staff.location}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{staff.coursesAttended}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      staff.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setSelectedStaff(staff)} className="text-sm text-[#1a6b3c] font-semibold hover:underline">View Details</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === staff.id ? null : staff.id); }} 
                      className="text-gray-400 group-hover:text-[#1a6b3c] transition p-1 rounded-full hover:bg-gray-100 ml-2"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {openDropdownId === staff.id && (
                      <div className="absolute right-8 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 border border-gray-100 py-1">
                        <button className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">Edit</button>
                        <button className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>Showing 1 to {mockStaff.length} of {mockStaff.length} entries</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 bg-[#1a6b3c] text-white rounded">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Comprehensive Staff Details Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <Image 
                  src={selectedStaff.photo} 
                  alt={selectedStaff.surname} 
                  width={48} 
                  height={48} 
                  className="rounded-full shadow-sm border border-gray-200" 
                />
                <div>
                  <h3 className="font-bold text-lg text-gray-800 leading-tight uppercase">{selectedStaff.surname} <span className="font-medium text-gray-600 capitalize">{selectedStaff.otherNames}</span></h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{selectedStaff.fileNo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Rank</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Briefcase size={14} className="text-[#1a6b3c]"/> {selectedStaff.rank}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Grade Level</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Hash size={14} className="text-[#1a6b3c]"/> {selectedStaff.gradeLevel}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Location</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><MapPin size={14} className="text-[#1a6b3c]"/> {selectedStaff.location}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    selectedStaff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedStaff.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Courses Attended</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><BookOpen size={14} className="text-[#1a6b3c]"/> {selectedStaff.coursesAttended}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <button className="flex-1 bg-[#1a6b3c] hover:bg-[#145530] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
                    View Full Record
                  </button>
                  <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
                    Message Staff
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-800">Add New Staff</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body (Form) */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                  <input type="text" placeholder="e.g. ABBA" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] uppercase" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Names</label>
                  <input type="text" placeholder="e.g. Sulaiman Nasir" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] capitalize" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">File No</label>
                  <input type="text" placeholder="e.g. NYSC/STF/..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rank</label>
                  <input type="text" placeholder="e.g. Senior Inspector" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                    <option value="">Select GL...</option>
                    <option value="GL 07">GL 07</option>
                    <option value="GL 08">GL 08</option>
                    <option value="GL 09">GL 09</option>
                    <option value="GL 10">GL 10</option>
                    <option value="GL 12">GL 12</option>
                    <option value="GL 13">GL 13</option>
                    <option value="GL 14">GL 14</option>
                    <option value="GL 15">GL 15</option>
                    <option value="GL 16">GL 16</option>
                    <option value="GL 17">GL 17</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" placeholder="e.g. NDHQ, Abuja" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] hover:bg-[#145530] shadow-sm transition">Save Staff Member</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
