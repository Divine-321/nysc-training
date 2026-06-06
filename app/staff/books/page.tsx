import { Search, Filter, Download, ExternalLink, FileText, Shield, Bookmark, BookOpen } from "lucide-react";

const resources = [
  {
    id: 1,
    title: "NYSC Handbook",
    category: "Rules & Regulations",
    description: "The official handbook governing the conduct of corps members and staff.",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-50",
    border: "border-red-100",
    size: "5.2 MB",
    date: "Updated Jan 2026"
  },
  {
    id: 2,
    title: "NYSC Yearbook",
    category: "Journals",
    description: "The official annual publication highlighting the scheme's activities and achievements.",
    icon: Bookmark,
    color: "text-[#1a6b3c]",
    bgColor: "bg-[#f0f7f3]",
    border: "border-green-100",
    size: "25.8 MB",
    date: "Updated Mar 2026"
  },
  {
    id: 3,
    title: "Conditions of Service",
    category: "Handbooks",
    description: "Official document outlining the terms of employment and service for all staff.",
    icon: BookOpen,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    border: "border-blue-100",
    size: "2.1 MB",
    date: "Updated Nov 2025"
  },
  {
    id: 4,
    title: "Composite Policy",
    category: "Policy",
    description: "A collection of key operational policies governing the NYSC scheme.",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    border: "border-purple-100",
    size: "1.8 MB",
    date: "Published Q1 2026"
  },
  {
    id: 5,
    title: "NYSC Act",
    category: "Legal",
    description: "The enabling act establishing the National Youth Service Corps.",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-50",
    border: "border-red-100",
    size: "0.9 MB",
    date: "Updated Feb 2026"
  },
  {
    id: 6,
    title: "Public Service Rules (PSR)",
    category: "Rules & Regulations",
    description: "The comprehensive rules governing the conduct of all public servants in Nigeria.",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-50",
    border: "border-red-100",
    size: "8.3 MB",
    date: "Updated Apr 2026"
  }
];

export default function LibraryPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Library & Resources</h2>
          <p className="text-sm text-gray-500">Access official NYSC handbooks, journals, rules, and work ethics.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search library..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] shadow-sm"
            />
          </div>
          <button className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm shrink-0">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <div key={resource.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition group">
            <div className={`w-full h-32 rounded-xl ${resource.bgColor} ${resource.border} border flex items-center justify-center mb-5 group-hover:scale-[1.02] transition-transform`}>
              <resource.icon size={48} className={resource.color} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${resource.bgColor} ${resource.color}`}>
                {resource.category}
              </span>
              <h3 className="text-lg font-bold text-gray-800 mt-3 mb-2 leading-tight">{resource.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{resource.description}</p>
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-800">{resource.size}</span>
                <span className="text-xs text-gray-400">{resource.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-[#1a6b3c] hover:bg-[#f0f7f3] rounded-lg transition" title="Download PDF">
                  <Download size={18} />
                </button>
                <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm">
                  <ExternalLink size={16} />
                  Read
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}