"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  MapPin,
  Briefcase,
  BookOpen,
  Hash,
  Layers,
  Mail,
} from "lucide-react";

import {
  extractErrorMessage,
  readApiList,
  type AuthUser,
} from "@/app/lib/portal-api";

type StaffUser = {
  id: string;
  photo: string;
  fileNo: string;
  email: string;
  surname: string;
  otherNames: string;
  rank: string;
  gradeLevel: string;
  location: string;
  cohort: string;
  coursesAttended: number;
  status: string;
};

type StaffListResponse = {
  data?: {
    count: number;
    next: string | null;
    previous: string | null;
    results: AuthUser[];
  };
};

type Posting = {
  id: number;
  staff: {
    id: number;
  };
  state: {
    name: string;
  } | null;
  department: {
    name: string;
  } | null;
  grade_level: {
    code: string;
  } | null;
  rank: {
    title: string;
  } | null;
  is_current: boolean;
  status: "active" | "retired";
};

type CohortOption = {
  id: number;
  name: string;
  batch: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
};

type CohortStaffAssignment = {
  id: number;
  cohort: number;
  cohort_name: string;
  staff: number;
};

type BulkUploadData = {
  total_rows: number;
  assigned_count: number;
  skipped_existing: number;
  failed_count: number;
  errors: Array<Record<string, unknown>>;
};

export default function AdminUsersPage() {
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [liveStaff, setLiveStaff] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const pageSize = 20;

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [cohortError, setCohortError] = useState("");
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const [cohortFile, setCohortFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadData | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const staffList = liveStaff;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStaff = staffList.filter((staff) =>
    [staff.surname, staff.otherNames, staff.fileNo].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  );

  const firstStaffNumber = totalStaff === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastStaffNumber = Math.min(page * pageSize, totalStaff);

  const totalPages = Math.max(1, Math.ceil(totalStaff / pageSize));

  useEffect(() => {
    const loadStaff = async () => {
      setLoadingStaff(true);

      try {
        const [staffResponse, postingsResponse, cohortStaffResponse] =
          await Promise.all([
          fetch(`/api/accounts/staff?page=${page}&page_size=${pageSize}`, {
            cache: "no-store",
          }),
          fetch("/api/organization/postings", {
            cache: "no-store",
          }),
          fetch("/api/training/cohort-staff", {
            cache: "no-store",
          }),
        ]);

        const [staffPayload, postingsPayload, cohortStaffPayload] =
          await Promise.all([
            staffResponse.json().catch(() => null),
            postingsResponse.json().catch(() => null),
            cohortStaffResponse.json().catch(() => null),
          ]);

        if (!staffResponse.ok) {
          throw new Error(
            extractErrorMessage(staffPayload, "Could not load staff."),
          );
        }

        const typedStaffPayload = staffPayload as StaffListResponse | null;

        const users = typedStaffPayload?.data?.results ?? [];

        const postings = postingsResponse.ok
          ? readApiList<Posting>(postingsPayload)
          : [];

        const postingByStaffId = new Map<number, Posting>();
        const cohortNamesByStaffId = new Map<number, string[]>();

        for (const posting of postings) {
          const existingPosting = postingByStaffId.get(posting.staff.id);

          if (posting.is_current || !existingPosting) {
            postingByStaffId.set(posting.staff.id, posting);
          }
        }

        if (cohortStaffResponse.ok) {
          for (const assignment of readApiList<CohortStaffAssignment>(
            cohortStaffPayload,
          )) {
            const current = cohortNamesByStaffId.get(assignment.staff) ?? [];
            current.push(assignment.cohort_name);
            cohortNamesByStaffId.set(assignment.staff, current);
          }
        }

        setTotalStaff(typedStaffPayload?.data?.count ?? 0);
        setHasNextPage(Boolean(typedStaffPayload?.data?.next));
        setHasPreviousPage(Boolean(typedStaffPayload?.data?.previous));
        setSelectedStaffIds([]);

        setLiveStaff(
          users.map((user) => {
            const posting = postingByStaffId.get(user.id);

            const location =
              [posting?.state?.name, posting?.department?.name]
                .filter(Boolean)
                .join(" / ") || "Not assigned";

            return {
              id: String(user.id),
              photo:
                user.profile?.profile_picture_url || "/1-blank-profile.png",
              fileNo: user.file_number || "Not assigned",
              email: user.email,
              surname: user.last_name || "",
              otherNames: [user.first_name, user.middle_name]
                .filter(Boolean)
                .join(" "),
              rank: posting?.rank?.title || "Not assigned",
              gradeLevel: posting?.grade_level?.code || "Not assigned",
              location,
              cohort:
                cohortNamesByStaffId.get(user.id)?.join(", ") ||
                "Not assigned",
              coursesAttended: 0,
              status:
                posting?.status === "retired"
                  ? "Retired"
                  : user.is_active
                    ? "Active"
                    : "Inactive",
            };
          }),
        );

        setStaffError(
          postingsResponse.ok
            ? ""
            : "Staff loaded, but posting details could not be loaded.",
        );
      } catch (error) {
        setStaffError(
          error instanceof Error ? error.message : "Could not load staff.",
        );
      } finally {
        setLoadingStaff(false);
      }
    };

    void loadStaff();
  }, [page]);

  useEffect(() => {
    const loadCohorts = async () => {
      try {
        const response = await fetch("/api/training/cohorts", {
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(payload, "Could not load cohorts."),
          );
        }

        setCohorts(readApiList<CohortOption>(payload));
        setCohortError("");
      } catch (error) {
        setCohortError(
          error instanceof Error ? error.message : "Could not load cohorts.",
        );
      } finally {
        setLoadingCohorts(false);
      }
    };

    void loadCohorts();
  }, []);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedStaffIds(filteredStaff.map((staff) => staff.id));
    } else {
      setSelectedStaffIds([]);
    }
  };

  const handleAssignSelectedStaff = async () => {
    if (!selectedCohort) {
      setAssignmentError("Please select a cohort.");
      return;
    }

    if (selectedStaffIds.length === 0) {
      setAssignmentError("Please select at least one staff member.");
      return;
    }

    setAssigningStaff(true);
    setAssignmentError("");
    setAssignmentNotice("");

    const results = await Promise.all(
      selectedStaffIds.map(async (staffId) => {
        try {
          const response = await fetch("/api/training/cohort-staff", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cohort: Number(selectedCohort),
              staff: Number(staffId),
            }),
          });

          const payload = await response.json().catch(() => null);

          return {
            staffId,
            ok: response.ok,
            message: response.ok
              ? ""
              : extractErrorMessage(
                  payload,
                  "Could not assign this staff member.",
                ),
          };
        } catch {
          return {
            staffId,
            ok: false,
            message: "Network error.",
          };
        }
      }),
    );

    const successful = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);

    if (successful.length > 0) {
      setAssignmentNotice(
        `${successful.length} staff member${
          successful.length === 1 ? "" : "s"
        } assigned successfully.`,
      );
    }

    if (failed.length > 0) {
      setAssignmentError(
        `${failed.length} assignment${
          failed.length === 1 ? "" : "s"
        } failed. ${failed[0].message}`,
      );

      setSelectedStaffIds(failed.map((result) => result.staffId));
    } else {
      setSelectedStaffIds([]);
      setSelectedCohort("");
      setShowAssignmentModal(false);
    }

    setAssigningStaff(false);
  };

  const handleBulkUpload = async () => {
    if (!selectedCohort) {
      setAssignmentError("Please select a cohort.");
      return;
    }

    if (!cohortFile) {
      setFileError("Please select a CSV file.");
      return;
    }

    setBulkUploading(true);
    setAssignmentError("");
    setAssignmentNotice("");
    setBulkResult(null);

    try {
      const formData = new FormData();
      formData.set("file", cohortFile);

      const response = await fetch(
        `/api/training/cohorts/${selectedCohort}/bulk-upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not import this CSV file."),
        );
      }

      const result = payload?.data as BulkUploadData | undefined;

      if (!result) {
        throw new Error("The bulk-upload response did not contain result data.");
      }

      setBulkResult(result);
      setAssignmentNotice(payload?.message || "Staff import completed.");
      setCohortFile(null);
      setFileInputKey((current) => current + 1);
    } catch (uploadError) {
      setAssignmentError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not import this CSV file.",
      );
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Staff</h2>
          <p className="text-sm text-gray-500 mt-1">
            View staff directory and personnel details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setAssignmentError("");
              setFileError("");
              setShowAssignmentModal(true);
            }}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <BookOpen size={18} className="text-gray-500" />
            Assign Cohort
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              placeholder="Search staff by name or file no..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
        </div>

        {loadingStaff && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-500">
            Loading staff...
          </div>
        )}

        {staffError && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {staffError}
          </div>
        )}

        {assignmentNotice && (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {assignmentNotice}
          </div>
        )}

        {!loadingStaff && !staffError && staffList.length === 0 && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-500">
            No staff accounts were found.
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#1a6b3c] border-gray-300 rounded cursor-pointer"
                    checked={
                      filteredStaff.length > 0 &&
                      selectedStaffIds.length === filteredStaff.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-medium">Staff Member</th>
                <th className="px-6 py-4 font-medium">File No</th>
                <th className="px-6 py-4 font-medium">Rank & GL</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Cohort</th>
                <th className="px-6 py-4 font-medium">Courses</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => (
                <tr
                  key={staff.id}
                  className="hover:bg-gray-50 transition group"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#1a6b3c] border-gray-300 rounded cursor-pointer"
                      checked={selectedStaffIds.includes(staff.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedStaffIds([...selectedStaffIds, staff.id]);
                        } else {
                          setSelectedStaffIds(
                            selectedStaffIds.filter((id) => id !== staff.id),
                          );
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={staff.photo}
                        alt={staff.surname}
                        width={36}
                        height={36}
                        className="rounded-full bg-gray-100 object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-800 uppercase tracking-tight">
                          {staff.surname}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {staff.otherNames}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {staff.fileNo}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{staff.rank}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {staff.gradeLevel}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[12rem]">
                    {staff.location}
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[12rem]">
                    {staff.cohort}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {staff.coursesAttended}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        staff.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setSelectedStaff(staff)}
                      className="text-sm text-[#1a6b3c] font-semibold hover:underline"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(
                          openDropdownId === staff.id ? null : staff.id,
                        );
                      }}
                      className="text-gray-400 group-hover:text-[#1a6b3c] transition p-1 rounded-full hover:bg-gray-100 ml-2"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {openDropdownId === staff.id && (
                      <div className="absolute right-8 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 border border-gray-100 py-1">
                        <button className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">
                          Edit
                        </button>
                        <button className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                          Delete
                        </button>
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
          <p>
            {searchTerm
              ? `${filteredStaff.length} matching staff on this page`
              : `Showing ${firstStaffNumber}–${lastStaffNumber} of ${totalStaff} staff`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasPreviousPage || loadingStaff}
              onClick={() => {
                setSearchTerm("");
                setPage((current) => Math.max(1, current - 1));
              }}
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>

            <span className="px-3 py-1 font-medium text-gray-700">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={!hasNextPage || loadingStaff}
              onClick={() => {
                setSearchTerm("");
                setPage((current) => current + 1);
              }}
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
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
                  <h3 className="font-bold text-lg text-gray-800 leading-tight uppercase">
                    {selectedStaff.surname}{" "}
                    <span className="font-medium text-gray-600 capitalize">
                      {selectedStaff.otherNames}
                    </span>
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    {selectedStaff.fileNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Rank
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-[#1a6b3c]" />{" "}
                    {selectedStaff.rank}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Grade Level
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Hash size={14} className="text-[#1a6b3c]" />{" "}
                    {selectedStaff.gradeLevel}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Location
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#1a6b3c]" />{" "}
                    {selectedStaff.location}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Cohort
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#1a6b3c]" />{" "}
                    {selectedStaff.cohort}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      selectedStaff.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedStaff.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Courses Attended
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[#1a6b3c]" />{" "}
                    {selectedStaff.coursesAttended}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <button className="flex-1 bg-[#1a6b3c] hover:bg-[#145530] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
                    Edit Record
                  </button>
                  <a
                    href={`mailto:${selectedStaff.email}?subject=${encodeURIComponent(
                      "NYSC E-Training Message",
                    )}`}
                    className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <Mail size={15} />
                    Message Staff
                  </a>
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
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surname
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABBA"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] uppercase"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Names
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sulaiman Nasir"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] capitalize"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NYSC/STF/..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rank
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Inspector"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NDHQ, Abuja"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] hover:bg-[#145530] shadow-sm transition"
                >
                  Save Staff Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Cohort Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-bold text-lg text-gray-800">Assign Cohort</h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {assignmentError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {assignmentError}
                </div>
              )}

              {selectedStaffIds.length > 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Staff ({selectedStaffIds.length})
                    </label>
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 bg-gray-50 space-y-1">
                      {staffList
                        .filter((s) => selectedStaffIds.includes(s.id))
                        .map((staff) => (
                          <div
                            key={staff.id}
                            className="flex items-center justify-between py-2 px-3 border border-gray-100 bg-white rounded-md shadow-sm"
                          >
                            <span className="text-sm font-semibold text-gray-800">
                              {staff.surname}{" "}
                              <span className="font-normal text-gray-600">
                                {staff.otherNames}
                              </span>
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              {staff.fileNo}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cohort-select"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Select Cohort
                    </label>
                    <select
                      id="cohort-select"
                      value={selectedCohort}
                      onChange={(e) => setSelectedCohort(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
                    >
                      <option value="">
                        {loadingCohorts
                          ? "Loading cohorts..."
                          : "Select Cohort..."}
                      </option>

                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={String(cohort.id)}>
                          {cohort.name} - {cohort.batch}
                        </option>
                      ))}
                    </select>
                    {cohortError && (
                      <p className="mt-1 text-xs text-red-600">
                        {cohortError}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="cohort-select"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Select Cohort
                    </label>
                    <select
                      id="cohort-select"
                      value={selectedCohort}
                      onChange={(e) => setSelectedCohort(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
                    >
                      <option value="">
                        {loadingCohorts
                          ? "Loading cohorts..."
                          : "Select Cohort..."}
                      </option>

                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={String(cohort.id)}>
                          {cohort.name} - {cohort.batch}
                        </option>
                      ))}
                    </select>

                    {cohortError && (
                      <p className="mt-1 text-xs text-red-600">
                        {cohortError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload List
                    </label>
                    <div className="border border-gray-300 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50">
                      <p className="text-sm font-semibold text-gray-800 mb-1">
                        Upload Trainees File
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Supported format: .csv
                      </p>
                      <input
                        key={fileInputKey}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;

                          setFileError("");
                          setCohortFile(null);
                          setBulkResult(null);

                          if (!file) return;

                          if (!file.name.toLowerCase().endsWith(".csv")) {
                            setFileError("Please select a CSV file.");
                            event.target.value = "";
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            setFileError("The CSV file must not exceed 5MB.");
                            event.target.value = "";
                            return;
                          }

                          setCohortFile(file);
                        }}
                        className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#e8f5ee] file:text-[#1a6b3c] hover:file:bg-[#d1ebd9] cursor-pointer"
                      />

                      {cohortFile && (
                        <p className="mt-3 text-xs text-green-700">
                          Selected: {cohortFile.name}
                        </p>
                      )}

                      {fileError && (
                        <p className="mt-3 text-xs text-red-600">
                          {fileError}
                        </p>
                      )}

                      <p className="mt-3 text-center text-xs text-gray-500">
                        Row 1 must be a header named file_number. Put one staff
                        file number in Column A on each following row.
                      </p>
                    </div>
                  </div>

                  {bulkResult && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-xl font-bold text-gray-800">
                          {bulkResult.total_rows}
                        </p>
                        <p className="text-xs text-gray-500">Total rows</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <p className="text-xl font-bold text-green-700">
                          {bulkResult.assigned_count}
                        </p>
                        <p className="text-xs text-green-600">Assigned</p>
                      </div>
                      <div className="rounded-lg bg-yellow-50 p-3 text-center">
                        <p className="text-xl font-bold text-yellow-700">
                          {bulkResult.skipped_existing}
                        </p>
                        <p className="text-xs text-yellow-600">Skipped</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <p className="text-xl font-bold text-red-700">
                          {bulkResult.failed_count}
                        </p>
                        <p className="text-xs text-red-600">Failed</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAssignmentError("");
                  setFileError("");
                  setCohortFile(null);
                  setBulkResult(null);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              {selectedStaffIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleAssignSelectedStaff}
                  disabled={assigningStaff || !selectedCohort}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] hover:bg-[#145530] shadow-sm transition disabled:opacity-50"
                >
                  {assigningStaff ? "Assigning..." : "Assign to Cohort"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBulkUpload}
                  disabled={bulkUploading || !selectedCohort || !cohortFile}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] disabled:opacity-50"
                >
                  {bulkUploading ? "Uploading CSV..." : "Upload CSV"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
