"use client";

import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal, X, Mail, Phone, MapPin, Briefcase, BookOpen } from "lucide-react";
import { staffUsers } from "@/app/data/adminData";

type StaffUser = typeof staffUsers[0];

export default function AdminUsersPage() {
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Staff</h2>
          <p className="text-sm text-gray-500 mt-1">View staff directory and their training groups.</p>
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
              placeholder="Search staff by name or email..."
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
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Cohort</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {staffUsers.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50 transition group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{staff.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{staff.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{staff.department}</td>
                  <td className="px-6 py-4 text-gray-600">{staff.cohort}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      staff.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
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
          <p>Showing 1 to {staffUsers.length} of {staffUsers.length} entries</p>
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
                <div className="w-12 h-12 rounded-full bg-[#f0f7f3] text-[#1a6b3c] flex items-center justify-center font-bold text-lg shadow-sm border border-green-100">
                  {selectedStaff.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 leading-tight">{selectedStaff.name}</h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">NYSC/STF/{selectedStaff.id.slice(-4) || '0000'}</p>
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
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Department</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Briefcase size={14} className="text-gray-400"/> {selectedStaff.department}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Cohort</p>
                  <p className="font-semibold text-gray-800">{selectedStaff.cohort}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    selectedStaff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedStaff.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Email Address</p>
                  <p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1.5" title={selectedStaff.email}><Mail size={14} className="text-gray-400 shrink-0"/> {selectedStaff.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Active Courses</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5"><BookOpen size={14} className="text-gray-400"/> 3 Enrolled</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Last Login</p>
                  <p className="font-medium text-gray-600 text-sm">2 hours ago</p>
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" placeholder="e.g. John Doe" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" placeholder="e.g. john.doe@nysc.gov.ng" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                    <option value="">Select Department...</option>
                    <option value="HR">Human Resource Management</option>
                    <option value="ICT">Information and Communications Technology (ICT)</option>
                    <option value="PRS">Planning, Research & Statistics (PRS)</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Audit">Internal Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cohort</label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                    <option value="">Select Cohort...</option>
                    <option value="Junior">Junior staff</option>
                    <option value="Middle">Middle level staff</option>
                    <option value="Senior">Senior staff</option>
                  </select>
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
