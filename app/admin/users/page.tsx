"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  Edit3,
  MapPin,
  Briefcase,
  BookOpen,
  Camera,
  Hash,
  Layers,
  Mail,
  Trash2,
  Users,
} from "lucide-react";

import {
  extractErrorMessage,
  readApiList,
  type AuthUser,
} from "@/app/lib/portal-api";
import {
  cohortCourseBatchLabel,
  type CohortCourse,
  type CourseEnrollment,
} from "@/app/lib/staff-learning";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import { useConfirm } from "@/app/components/useConfirm";

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
  department: string;
  cohort: string;
  coursesAttended: number;
  status: string;
  firstName: string;
  middleName: string;
  lastName: string;
  isActive: boolean;
  phoneNumber: string;
  profilePictureUrl: string;
  sex: string;
  dateOfBirth: string;
  employmentDate: string;
  hasPosting: boolean;
  stateId: string;
  departmentId: string;
  gradeLevelId: string;
  rankId: string;
  postingReasonId: string;
  postingStartDate: string;
  postingEndDate: string;
  postingStatus: "active" | "retired";
  postingRemarks: string;
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
    id: number;
    name: string;
  } | null;
  department: {
    id: number;
    name: string;
  } | null;
  grade_level: {
    id: number;
    code: string;
  } | null;
  rank: {
    id: number;
    title: string;
  } | null;
  posting_reason?: {
    id: number;
    name: string;
  } | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  status: "active" | "retired";
  remarks?: string;
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

type OrgOption = {
  id: number;
  name?: string;
  title?: string;
  code?: string;
  level?: number;
  short_form?: string;
};

type StaffEditForm = {
  first_name: string;
  middle_name: string;
  last_name: string;
  is_active: boolean;
  profile: {
    phone_number: string;
    profile_picture_url: string;
    sex: string;
    date_of_birth: string;
    employment_date: string;
  };
  posting: {
    state: string;
    department: string;
    grade_level: string;
    rank: string;
    posting_reason: string;
    start_date: string;
    end_date: string;
    status: "active" | "retired";
    remarks: string;
  };
};

type StaffRecordForm = {
  file_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  sex: "male" | "female" | "";
  date_of_birth: string;
  employment_date: string;
  state: string;
  department: string;
  grade_level: string;
  rank: string;
};

type UnregisteredStaffRecord = {
  id: number;
  file_number: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  sex?: string;
  date_of_birth?: string | null;
  employment_date?: string | null;
  is_registered: boolean;
  state?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  grade_level?: { id: number; code: string } | null;
  rank?: { id: number; title: string } | null;
};

type OrgOptions = {
  states: OrgOption[];
  departments: OrgOption[];
  gradeLevels: OrgOption[];
  ranks: OrgOption[];
  postingReasons: OrgOption[];
};

const emptyOrgOptions: OrgOptions = {
  states: [],
  departments: [],
  gradeLevels: [],
  ranks: [],
  postingReasons: [],
};

const emptyStaffRecordForm: StaffRecordForm = {
  file_number: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  sex: "",
  date_of_birth: "",
  employment_date: "",
  state: "",
  department: "",
  grade_level: "",
  rank: "",
};

const HQ_LOCATION_NAME = "NATIONAL DIRECTORATE HEADQUARTERS";

function isHqLocation(stateId: string, states: OrgOption[]) {
  const selected = states.find((option) => String(option.id) === stateId);
  return (selected?.name ?? "").trim().toUpperCase() === HQ_LOCATION_NAME;
}

function optionLabel(option: OrgOption, fallbackPrefix: string) {
  return (
    option.name ||
    option.title ||
    option.code ||
    option.short_form ||
    (option.level ? `GL-${option.level}` : "") ||
    `${fallbackPrefix} ${option.id}`
  );
}

function buildEditForm(staff: StaffUser): StaffEditForm {
  return {
    first_name: staff.firstName,
    middle_name: staff.middleName,
    last_name: staff.lastName,
    is_active: staff.isActive,
    profile: {
      phone_number: staff.phoneNumber,
      profile_picture_url: staff.profilePictureUrl,
      sex: staff.sex,
      date_of_birth: staff.dateOfBirth,
      employment_date: staff.employmentDate,
    },
    posting: {
      state: staff.stateId,
      department: staff.departmentId,
      grade_level: staff.gradeLevelId,
      rank: staff.rankId,
      posting_reason: staff.postingReasonId,
      start_date: staff.postingStartDate,
      end_date: staff.postingEndDate,
      status: staff.postingStatus,
      remarks: staff.postingRemarks,
    },
  };
}

function formatCohortAssignmentError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("unique set") ||
    (normalizedMessage.includes("staff") &&
      normalizedMessage.includes("unique"))
  ) {
    return "This staff member is already assigned to the selected course.";
  }

  if (
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("already assigned") ||
    normalizedMessage.includes("already exists")
  ) {
    return "This staff member is already assigned to the selected course.";
  }

  return message;
}

// Flip to `true` once the backend supports `?is_registered=false` on
// /api/accounts/staff-records/ (see backend request). Then the unregistered
// list fetches ONE page at a time (true server-side pagination) instead of
// loading every record and paging in the browser. Until then it stays false
// and the list loads all records, filters `!is_registered`, and pages client-
// side. This is the only line to change to switch over.
const UNREGISTERED_SERVER_PAGINATION = true;

export default function AdminUsersPage() {
  const { confirm, dialog } = useConfirm();
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState<StaffEditForm | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [liveStaff, setLiveStaff] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [staffReloadKey, setStaffReloadKey] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  // Backend sort filter (?sortBy=). Default to file number per request — note
  // the registered-staff endpoint otherwise defaults to surname server-side.
  const [staffSort, setStaffSort] = useState<"file_number" | "surname">(
    "file_number",
  );
  const [orgOptions, setOrgOptions] =
    useState<OrgOptions>(emptyOrgOptions);
  const [loadingOrgOptions, setLoadingOrgOptions] = useState(true);
  const [staffRecordForm, setStaffRecordForm] =
    useState<StaffRecordForm>(emptyStaffRecordForm);
  const [creatingStaffRecord, setCreatingStaffRecord] = useState(false);
  const [addStaffError, setAddStaffError] = useState("");
  const [addStaffNotice, setAddStaffNotice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [editError, setEditError] = useState("");
  const [editNotice, setEditNotice] = useState("");

  const [loadingUnregistered, setLoadingUnregistered] = useState(true);
  const [unregisteredError, setUnregisteredError] = useState("");
  const [unregisteredStaff, setUnregisteredStaff] = useState<
    UnregisteredStaffRecord[]
  >([]);
  const [unregisteredSupported, setUnregisteredSupported] = useState(true);
  const [editingUnregisteredId, setEditingUnregisteredId] = useState<
    number | null
  >(null);
  const [unregisteredEditForm, setUnregisteredEditForm] =
    useState<StaffRecordForm>(emptyStaffRecordForm);
  const [savingUnregisteredEdit, setSavingUnregisteredEdit] = useState(false);
  const [unregisteredEditError, setUnregisteredEditError] = useState("");
  const [deletingUnregisteredId, setDeletingUnregisteredId] = useState<
    number | null
  >(null);
  const [unregisteredSearch, setUnregisteredSearch] = useState("");
  const [unregisteredSort, setUnregisteredSort] = useState<
    "file_number" | "surname"
  >("file_number");
  const [unregisteredPage, setUnregisteredPage] = useState(1);
  // Server-mode total (only used when UNREGISTERED_SERVER_PAGINATION is on).
  const [unregisteredTotal, setUnregisteredTotal] = useState(0);
  const [debouncedUnregisteredSearch, setDebouncedUnregisteredSearch] =
    useState("");
  const [selectedUnregisteredIds, setSelectedUnregisteredIds] = useState<
    number[]
  >([]);
  const [bulkDeletingUnregistered, setBulkDeletingUnregistered] =
    useState(false);

  const pageSize = 20;
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  // New-model (Training Programme) assignment targets. When the restructured
  // backend is live, staff are assigned via Enrollment into a CohortCourse
  // instead of CohortStaff into a Cohort.
  const [programmeMode, setProgrammeMode] = useState(false);
  const [programmes, setProgrammes] = useState<CohortCourse[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [cohortError, setCohortError] = useState("");
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const [cohortFile, setCohortFile] = useState<File | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [fileError, setFileError] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadData | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const staffList = liveStaff;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isSearching = debouncedSearch.length > 0;

  // Unregistered-list mode helpers. `unregServerPaged` is true only when the
  // server-pagination flag is on AND there's no active search (search always
  // falls back to load-all + client filtering).
  const isSearchingUnregistered = debouncedUnregisteredSearch.length > 0;
  const unregServerPaged =
    UNREGISTERED_SERVER_PAGINATION && !unregisteredSearch.trim();
  const unregisteredHeaderCount = unregServerPaged
    ? unregisteredTotal
    : unregisteredStaff.length;

  const filteredStaff = staffList.filter((staff) =>
    [staff.surname, staff.otherNames, staff.fileNo].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  );

  const firstStaffNumber = totalStaff === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastStaffNumber = Math.min(page * pageSize, totalStaff);

  const totalPages = Math.max(1, Math.ceil(totalStaff / pageSize));

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
    }, 300);

    return () => clearTimeout(handle);
  }, [normalizedSearch]);

  useEffect(() => {
    const fetchStaffPage = async (pageNumber: number, size: number) => {
      const response = await fetch(
        `/api/accounts/staff?page=${pageNumber}&page_size=${size}&sortBy=${staffSort}`,
        { cache: "no-store" },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as StaffListResponse | null;

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Could not load staff."));
      }

      return payload;
    };

    const fetchAllStaff = async () => {
      const allResults: AuthUser[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const payload = await fetchStaffPage(currentPage, 100);
        allResults.push(...(payload?.data?.results ?? []));
        hasMore = Boolean(payload?.data?.next);
        currentPage += 1;
      }

      return { users: allResults, count: allResults.length, hasNext: false, hasPrevious: false };
    };

    const fetchCurrentPage = async () => {
      const payload = await fetchStaffPage(page, pageSize);

      return {
        users: payload?.data?.results ?? [],
        count: payload?.data?.count ?? 0,
        hasNext: Boolean(payload?.data?.next),
        hasPrevious: Boolean(payload?.data?.previous),
      };
    };

    const loadStaff = async () => {
      setLoadingStaff(true);

      try {
        const [
          staffResult,
          postingsResponse,
          cohortStaffResponse,
          enrollmentsResponse,
        ] = await Promise.all([
          isSearching ? fetchAllStaff() : fetchCurrentPage(),
          fetch("/api/organization/postings", {
            cache: "no-store",
          }),
          fetch("/api/training/cohort-staff", {
            cache: "no-store",
          }),
          // Staff are assigned to trainings via enrollments now, so the cohort
          // and course counts must include those — not just legacy cohort-staff.
          fetch("/api/training/enrollments", {
            cache: "no-store",
          }),
        ]);

        const [postingsPayload, cohortStaffPayload, enrollmentsPayload] =
          await Promise.all([
            postingsResponse.json().catch(() => null),
            cohortStaffResponse.json().catch(() => null),
            enrollmentsResponse.json().catch(() => null),
          ]);

        const users = staffResult.users;
        setTotalStaff(staffResult.count);
        setHasNextPage(staffResult.hasNext);
        setHasPreviousPage(staffResult.hasPrevious);

        const postings = postingsResponse.ok
          ? readApiList<Posting>(postingsPayload)
          : [];

        const postingByStaffId = new Map<number, Posting>();
        const cohortNamesByStaffId = new Map<number, Set<string>>();
        const courseCountByStaffId = new Map<number, number>();

        for (const posting of postings) {
          const existingPosting = postingByStaffId.get(posting.staff.id);

          if (posting.is_current || !existingPosting) {
            postingByStaffId.set(posting.staff.id, posting);
          }
        }

        const addCohortName = (staffId: number, name?: string | null) => {
          if (!name) return;
          const names = cohortNamesByStaffId.get(staffId) ?? new Set<string>();
          names.add(name);
          cohortNamesByStaffId.set(staffId, names);
        };

        // Legacy cohort-staff assignments.
        if (cohortStaffResponse.ok) {
          for (const assignment of readApiList<CohortStaffAssignment>(
            cohortStaffPayload,
          )) {
            addCohortName(assignment.staff, assignment.cohort_name);
          }
        }

        // Training enrollments — the current way staff are assigned. Each
        // enrollment tied to a programme contributes its cohort name and counts
        // as one course (orphaned enrollments with no programme are ignored).
        if (enrollmentsResponse.ok) {
          for (const enrollment of readApiList<CourseEnrollment>(
            enrollmentsPayload,
          )) {
            const programmeId =
              enrollment.programme ?? enrollment.cohort_course ?? null;
            if (programmeId == null) continue;

            addCohortName(enrollment.staff, enrollment.cohort_name);
            courseCountByStaffId.set(
              enrollment.staff,
              (courseCountByStaffId.get(enrollment.staff) ?? 0) + 1,
            );
          }
        }

        setSelectedStaffIds([]);

        setLiveStaff(
          users.map((user) => {
            const posting = postingByStaffId.get(user.id);

            const location = posting?.state?.name || "Not assigned";
            const department = posting?.department?.name || "Not assigned";

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
              department,
              cohort:
                Array.from(cohortNamesByStaffId.get(user.id) ?? []).join(
                  ", ",
                ) || "Not assigned",
              coursesAttended: courseCountByStaffId.get(user.id) ?? 0,
              status:
                posting?.status === "retired"
                  ? "Retired"
                  : user.is_active
                    ? "Active"
                    : "Inactive",
              firstName: user.first_name || "",
              middleName: user.middle_name || "",
              lastName: user.last_name || "",
              isActive: user.is_active,
              phoneNumber: user.profile?.phone_number || "",
              profilePictureUrl: user.profile?.profile_picture_url || "",
              sex: user.profile?.sex || "",
              dateOfBirth: user.profile?.date_of_birth || "",
              employmentDate: user.profile?.employment_date || "",
              hasPosting: Boolean(posting),
              stateId: posting?.state?.id ? String(posting.state.id) : "",
              departmentId: posting?.department?.id
                ? String(posting.department.id)
                : "",
              gradeLevelId: posting?.grade_level?.id
                ? String(posting.grade_level.id)
                : "",
              rankId: posting?.rank?.id ? String(posting.rank.id) : "",
              postingReasonId: posting?.posting_reason?.id
                ? String(posting.posting_reason.id)
                : "",
              postingStartDate: posting?.start_date || "",
              postingEndDate: posting?.end_date || "",
              postingStatus: posting?.status || "active",
              postingRemarks: posting?.remarks || "",
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
  }, [page, staffReloadKey, isSearching, staffSort]);

  useEffect(() => {
    const loadOrgOptions = async () => {
      try {
        const [
          statesResponse,
          departmentsResponse,
          gradeLevelsResponse,
          ranksResponse,
          postingReasonsResponse,
        ] = await Promise.all([
          fetch("/api/organization/states", { cache: "no-store" }),
          fetch("/api/organization/departments", { cache: "no-store" }),
          fetch("/api/organization/grade-levels", { cache: "no-store" }),
          fetch("/api/organization/ranks", { cache: "no-store" }),
          fetch("/api/organization/posting-reasons", { cache: "no-store" }),
        ]);

        const [
          statesPayload,
          departmentsPayload,
          gradeLevelsPayload,
          ranksPayload,
          postingReasonsPayload,
        ] = await Promise.all([
          statesResponse.json().catch(() => null),
          departmentsResponse.json().catch(() => null),
          gradeLevelsResponse.json().catch(() => null),
          ranksResponse.json().catch(() => null),
          postingReasonsResponse.json().catch(() => null),
        ]);

        setOrgOptions({
          states: statesResponse.ok
            ? readApiList<OrgOption>(statesPayload)
            : [],
          departments: departmentsResponse.ok
            ? readApiList<OrgOption>(departmentsPayload)
            : [],
          gradeLevels: gradeLevelsResponse.ok
            ? readApiList<OrgOption>(gradeLevelsPayload)
            : [],
          ranks: ranksResponse.ok ? readApiList<OrgOption>(ranksPayload) : [],
          postingReasons: postingReasonsResponse.ok
            ? readApiList<OrgOption>(postingReasonsPayload)
            : [],
        });
      } finally {
        setLoadingOrgOptions(false);
      }
    };

    void loadOrgOptions();
  }, []);

  useEffect(() => {
    // Loads assignment targets across both backend models: Training
    // Programmes (new — cohort is a batch string / year exists) or dynamic
    // Cohorts (legacy).
    const loadAssignmentTargets = async () => {
      try {
        const programmeResponse = await fetch("/api/training/cohort-courses", {
          cache: "no-store",
        });
        const programmePayload = await programmeResponse
          .json()
          .catch(() => null);
        const programmeList = programmeResponse.ok
          ? readApiList<CohortCourse>(programmePayload)
          : [];

        const isNewModel = programmeList.some(
          (item) => typeof item.cohort === "string" || item.year !== undefined,
        );

        if (isNewModel) {
          setProgrammeMode(true);
          setProgrammes(programmeList);
          setCohortError("");
          return;
        }

        const response = await fetch("/api/training/cohorts", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          // Old cohorts endpoint gone but the programme list was empty —
          // we are on the new backend with no programmes created yet.
          if (response.status === 404 && programmeResponse.ok) {
            setProgrammeMode(true);
            setProgrammes(programmeList);
            setCohortError("");
            return;
          }

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

    void loadAssignmentTargets();
  }, []);

  // Debounce the unregistered search so server-mode fetches don't fire on
  // every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedUnregisteredSearch(unregisteredSearch.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handle);
  }, [unregisteredSearch]);

  // CLIENT MODE (flag off): load every record once, filter to unregistered, and
  // page in the browser. Page changes re-slice locally without refetching.
  useEffect(() => {
    if (UNREGISTERED_SERVER_PAGINATION) return;

    const loadUnregisteredStaff = async () => {
      setLoadingUnregistered(true);
      try {
        const allRecords: UnregisteredStaffRecord[] = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/accounts/staff-records?page=${currentPage}&page_size=100&sortBy=${unregisteredSort}`,
            { cache: "no-store" },
          );

          if (response.status === 404 || response.status === 405) {
            setUnregisteredSupported(false);
            setUnregisteredStaff([]);
            return;
          }

          const payload = (await response.json().catch(() => null)) as {
            data?: {
              results?: UnregisteredStaffRecord[];
              next?: string | null;
            };
          } | null;

          if (!response.ok) {
            throw new Error(
              extractErrorMessage(
                payload,
                "Could not load unregistered staff records.",
              ),
            );
          }

          allRecords.push(...(payload?.data?.results ?? []));
          hasMore = Boolean(payload?.data?.next);
          currentPage += 1;
        }

        setUnregisteredSupported(true);
        setUnregisteredStaff(
          allRecords.filter((record) => !record.is_registered),
        );
        setUnregisteredError("");
      } catch (loadError) {
        setUnregisteredError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load unregistered staff records.",
        );
      } finally {
        setLoadingUnregistered(false);
      }
    };

    void loadUnregisteredStaff();
  }, [staffReloadKey, unregisteredSort]);

  // SERVER MODE (flag on): fetch just the current page via ?is_registered=false.
  // While searching, load all matches and filter/paginate client-side (mirrors
  // the registered-staff list). Dormant until the flag is flipped.
  useEffect(() => {
    if (!UNREGISTERED_SERVER_PAGINATION) return;

    const parse = async (response: Response) =>
      (await response.json().catch(() => null)) as {
        data?: {
          results?: UnregisteredStaffRecord[];
          next?: string | null;
          count?: number;
        };
      } | null;

    const loadUnregisteredStaff = async () => {
      setLoadingUnregistered(true);
      try {
        if (isSearchingUnregistered) {
          const allRecords: UnregisteredStaffRecord[] = [];
          let currentPage = 1;
          let hasMore = true;

          while (hasMore) {
            const response = await fetch(
              `/api/accounts/staff-records?page=${currentPage}&page_size=100&sortBy=${unregisteredSort}&is_registered=false`,
              { cache: "no-store" },
            );

            if (response.status === 404 || response.status === 405) {
              setUnregisteredSupported(false);
              setUnregisteredStaff([]);
              return;
            }

            const payload = await parse(response);

            if (!response.ok) {
              throw new Error(
                extractErrorMessage(
                  payload,
                  "Could not load unregistered staff records.",
                ),
              );
            }

            allRecords.push(...(payload?.data?.results ?? []));
            hasMore = Boolean(payload?.data?.next);
            currentPage += 1;
          }

          setUnregisteredSupported(true);
          // Defensive: keep only unregistered rows even though we asked the
          // backend to filter — harmless if the filter works, safe if it ever
          // doesn't.
          setUnregisteredStaff(
            allRecords.filter((record) => !record.is_registered),
          );
          setUnregisteredError("");
          return;
        }

        const response = await fetch(
          `/api/accounts/staff-records?page=${unregisteredPage}&page_size=${pageSize}&sortBy=${unregisteredSort}&is_registered=false`,
          { cache: "no-store" },
        );

        if (response.status === 404 || response.status === 405) {
          setUnregisteredSupported(false);
          setUnregisteredStaff([]);
          return;
        }

        const payload = await parse(response);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              payload,
              "Could not load unregistered staff records.",
            ),
          );
        }

        setUnregisteredSupported(true);
        setUnregisteredStaff(
          (payload?.data?.results ?? []).filter(
            (record) => !record.is_registered,
          ),
        );
        setUnregisteredTotal(payload?.data?.count ?? 0);
        setUnregisteredError("");
      } catch (loadError) {
        setUnregisteredError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load unregistered staff records.",
        );
      } finally {
        setLoadingUnregistered(false);
      }
    };

    void loadUnregisteredStaff();
  }, [
    staffReloadKey,
    unregisteredSort,
    unregisteredPage,
    isSearchingUnregistered,
    pageSize,
  ]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedStaffIds(filteredStaff.map((staff) => staff.id));
    } else {
      setSelectedStaffIds([]);
    }
  };

  // Unified dropdown options across both models.
  const assignTargets = programmeMode
    ? programmes.map((programme) => ({
        id: programme.id,
        label: `${
          programme.course_details?.title ?? `Course #${programme.course}`
        } — ${cohortCourseBatchLabel(programme)}${
          programme.year ? ` ${programme.year}` : ""
        }`,
      }))
    : cohorts.map((cohort) => ({
        id: cohort.id,
        label: `${cohort.name} - ${cohort.batch}`,
      }));
  const targetLabel = programmeMode ? "Course" : "Cohort";

  const handleAssignSelectedStaff = async () => {
    if (!selectedCohort) {
      setAssignmentError(
        programmeMode ? "Please select a course." : "Please select a cohort.",
      );
      return;
    }

    if (selectedStaffIds.length === 0) {
      setAssignmentError("Please select at least one staff member.");
      return;
    }

    // Refresher guard: the same course may legitimately be delivered to a
    // staff member again (yearly refreshers), but it should be deliberate —
    // progress and attempts start over on the new enrollment. Warn when any
    // selected staff already has this training's course from another delivery.
    if (programmeMode) {
      const targetProgramme = programmes.find(
        (programme) => programme.id === Number(selectedCohort),
      );
      const targetCourseId = targetProgramme?.course ?? null;

      if (targetCourseId != null) {
        const enrollmentsPayload = await fetch("/api/training/enrollments", {
          cache: "no-store",
        })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null);
        const courseByProgrammeId = new Map(
          programmes.map((programme) => [programme.id, programme.course]),
        );
        const staffWithCourse = new Set(
          readApiList<CourseEnrollment>(enrollmentsPayload)
            .filter((enrollment) => {
              const programmeId =
                enrollment.programme ?? enrollment.cohort_course;
              return (
                programmeId != null &&
                courseByProgrammeId.get(programmeId) === targetCourseId
              );
            })
            .map((enrollment) => String(enrollment.staff)),
        );
        const alreadyAssigned = selectedStaffIds.filter((staffId) =>
          staffWithCourse.has(staffId),
        );

        if (alreadyAssigned.length > 0) {
          const names = alreadyAssigned
            .map((staffId) => {
              const staff = staffList.find((item) => item.id === staffId);
              return staff ? `${staff.surname} ${staff.otherNames}`.trim() : null;
            })
            .filter(Boolean)
            .join(", ");
          const confirmed = await confirm(
            `${names || `${alreadyAssigned.length} selected staff`} already ${
              alreadyAssigned.length === 1 ? "has" : "have"
            } "${targetProgramme?.course_details?.title ?? "this course"}" from an earlier training. Assign again as a fresh run? Their progress, tests and attempts will start over for the new training.`,
          );

          if (!confirmed) return;
        }
      }
    }

    setAssigningStaff(true);
    setAssignmentError("");
    setAssignmentNotice("");

    const results = await Promise.all(
      selectedStaffIds.map(async (staffId) => {
        try {
          // New model: assignment IS an Enrollment into the programme.
          const response = await fetch(
            programmeMode
              ? "/api/training/enrollments"
              : "/api/training/cohort-staff",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(
                programmeMode
                  ? {
                      // Backend renamed the FK to `programme`; send both so the
                      // new serializer and any older one both accept it.
                      programme: Number(selectedCohort),
                      cohort_course: Number(selectedCohort),
                      staff: Number(staffId),
                    }
                  : {
                      cohort: Number(selectedCohort),
                      staff: Number(staffId),
                    },
              ),
            },
          );

          const payload = await response.json().catch(() => null);

          return {
            staffId,
            ok: response.ok,
            message: response.ok
              ? ""
              : formatCohortAssignmentError(
                  extractErrorMessage(
                    payload,
                    "Could not assign this staff member.",
                  ),
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

  // One call enrolls every active staff member of a department into the
  // selected Training Programme; the backend skips already-enrolled staff
  // and notifies each new enrollee by email/SMS.
  const handleDepartmentAssign = async () => {
    if (!selectedCohort) {
      setAssignmentError("Please select a course.");
      return;
    }
    if (!selectedDepartment) {
      setAssignmentError("Please select a department.");
      return;
    }

    setBulkAssigning(true);
    setAssignmentError("");
    setAssignmentNotice("");

    try {
      const response = await fetch("/api/training/cohort-courses/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort_course_id: Number(selectedCohort),
          department: Number(selectedDepartment),
          active_staff_only: true,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not assign this department."),
        );
      }

      setAssignmentNotice(
        payload?.message || "Department assigned successfully.",
      );
      setSelectedDepartment("");
    } catch (assignError) {
      setAssignmentError(
        assignError instanceof Error
          ? assignError.message
          : "Could not assign this department.",
      );
    } finally {
      setBulkAssigning(false);
    }
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
        programmeMode
          ? `/api/training/cohort-courses/${selectedCohort}/bulk-enroll`
          : `/api/training/cohorts/${selectedCohort}/bulk-upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const rawMessage = extractErrorMessage(
          payload,
          "Could not import this CSV file.",
        );

        throw new Error(
          formatCohortAssignmentError(rawMessage),
        );
      }

      // The count grid renders only when the backend returned the counts.
      const result = payload?.data as BulkUploadData | undefined;
      setBulkResult(result?.total_rows !== undefined ? result : null);
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

  const startEditStaff = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditForm(buildEditForm(staff));
    setOpenDropdownId(null);
    setSelectedStaff(null);
    setEditError("");
    setEditNotice("");
  };

  const closeEditModal = () => {
    setEditingStaff(null);
    setEditForm(null);
    setEditError("");
  };

  const handleDeleteStaff = async (staff: StaffUser) => {
    const confirmed = await confirm(
      `Delete ${staff.surname} ${staff.otherNames}? This permanently removes their account.`,
      { danger: true },
    );

    if (!confirmed) return;

    setOpenDropdownId(null);
    setStaffError("");

    try {
      const response = await fetch(`/api/accounts/staff/${staff.id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this staff member."),
        );
      }

      setLiveStaff((current) => current.filter((item) => item.id !== staff.id));
    } catch (deleteError) {
      setStaffError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this staff member.",
      );
    }
  };

  const openAddStaffModal = () => {
    setStaffRecordForm(emptyStaffRecordForm);
    setAddStaffError("");
    setAddStaffNotice("");
    setShowAddModal(true);
  };

  const closeAddStaffModal = () => {
    setShowAddModal(false);
    setStaffRecordForm(emptyStaffRecordForm);
    setAddStaffError("");
  };

  const handleCreateStaffRecord = async () => {
    if (!staffRecordForm.file_number.trim()) {
      setAddStaffError("File number is required.");
      return;
    }

    if (!staffRecordForm.first_name.trim() || !staffRecordForm.last_name.trim()) {
      setAddStaffError("First name and surname are required.");
      return;
    }

    const isHq = isHqLocation(staffRecordForm.state, orgOptions.states);

    if (
      !staffRecordForm.sex ||
      !staffRecordForm.state ||
      !staffRecordForm.grade_level ||
      !staffRecordForm.rank ||
      (isHq && !staffRecordForm.department)
    ) {
      setAddStaffError(
        isHq
          ? "Sex, state, department, grade level and rank are required."
          : "Sex, state, grade level and rank are required.",
      );
      return;
    }

    setCreatingStaffRecord(true);
    setAddStaffError("");
    setAddStaffNotice("");

    try {
      const payload = {
        file_number: staffRecordForm.file_number.trim(),
        first_name: staffRecordForm.first_name.trim(),
        middle_name: staffRecordForm.middle_name.trim(),
        last_name: staffRecordForm.last_name.trim(),
        sex: staffRecordForm.sex,
        date_of_birth: staffRecordForm.date_of_birth || null,
        ...(staffRecordForm.employment_date
          ? { employment_date: staffRecordForm.employment_date }
          : {}),
        state: Number(staffRecordForm.state),
        ...(isHq && staffRecordForm.department
          ? { department: Number(staffRecordForm.department) }
          : {}),
        grade_level: Number(staffRecordForm.grade_level),
        rank: Number(staffRecordForm.rank),
      };

      const response = await fetch("/api/accounts/staff-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            responsePayload,
            "Could not create staff record.",
          ),
        );
      }

      setAddStaffNotice(
        responsePayload?.message ||
          "Staff record created. The staff can now register.",
      );
      setStaffRecordForm(emptyStaffRecordForm);
      setStaffReloadKey((current) => current + 1);
    } catch (error) {
      setAddStaffError(
        error instanceof Error
          ? error.message
          : "Could not create staff record.",
      );
    } finally {
      setCreatingStaffRecord(false);
    }
  };

  const startEditUnregisteredStaff = (record: UnregisteredStaffRecord) => {
    setEditingUnregisteredId(record.id);
    setUnregisteredEditForm({
      file_number: record.file_number,
      first_name: record.first_name ?? "",
      middle_name: record.middle_name ?? "",
      last_name: record.last_name ?? "",
      sex: record.sex === "male" || record.sex === "female" ? record.sex : "",
      date_of_birth: record.date_of_birth ?? "",
      employment_date: record.employment_date ?? "",
      state: record.state?.id ? String(record.state.id) : "",
      department: record.department?.id ? String(record.department.id) : "",
      grade_level: record.grade_level?.id ? String(record.grade_level.id) : "",
      rank: record.rank?.id ? String(record.rank.id) : "",
    });
    setUnregisteredEditError("");
  };

  const closeUnregisteredEditModal = () => {
    setEditingUnregisteredId(null);
    setUnregisteredEditForm(emptyStaffRecordForm);
    setUnregisteredEditError("");
  };

  const handleSaveUnregisteredStaff = async () => {
    if (editingUnregisteredId === null) return;

    if (
      !unregisteredEditForm.first_name.trim() ||
      !unregisteredEditForm.last_name.trim()
    ) {
      setUnregisteredEditError("First name and surname are required.");
      return;
    }

    const isHq = isHqLocation(unregisteredEditForm.state, orgOptions.states);

    setSavingUnregisteredEdit(true);
    setUnregisteredEditError("");

    try {
      const payload = {
        first_name: unregisteredEditForm.first_name.trim(),
        middle_name: unregisteredEditForm.middle_name.trim(),
        last_name: unregisteredEditForm.last_name.trim(),
        sex: unregisteredEditForm.sex || undefined,
        date_of_birth: unregisteredEditForm.date_of_birth || null,
        employment_date: unregisteredEditForm.employment_date || null,
        state: unregisteredEditForm.state
          ? Number(unregisteredEditForm.state)
          : undefined,
        ...(isHq && unregisteredEditForm.department
          ? { department: Number(unregisteredEditForm.department) }
          : {}),
        grade_level: unregisteredEditForm.grade_level
          ? Number(unregisteredEditForm.grade_level)
          : undefined,
        rank: unregisteredEditForm.rank
          ? Number(unregisteredEditForm.rank)
          : undefined,
      };

      const response = await fetch(
        `/api/accounts/staff-records/${editingUnregisteredId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            responsePayload,
            "Could not update this staff record.",
          ),
        );
      }

      closeUnregisteredEditModal();
      setStaffReloadKey((current) => current + 1);
    } catch (saveError) {
      setUnregisteredEditError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update this staff record.",
      );
    } finally {
      setSavingUnregisteredEdit(false);
    }
  };

  const handleDeleteUnregisteredStaff = async (
    record: UnregisteredStaffRecord,
  ) => {
    const confirmed = await confirm(
      `Delete the staff record for ${
        [record.first_name, record.last_name].filter(Boolean).join(" ") ||
        record.file_number
      }? This staff member will no longer be able to register.`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingUnregisteredId(record.id);
    setUnregisteredError("");

    try {
      const response = await fetch(
        `/api/accounts/staff-records/${record.id}`,
        { method: "DELETE" },
      );

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this staff record."),
        );
      }

      setUnregisteredStaff((current) =>
        current.filter((item) => item.id !== record.id),
      );
    } catch (deleteError) {
      setUnregisteredError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this staff record.",
      );
    } finally {
      setDeletingUnregisteredId(null);
    }
  };

  const handleBulkDeleteUnregistered = async () => {
    if (selectedUnregisteredIds.length === 0) return;

    const confirmed = await confirm(
      `Delete ${selectedUnregisteredIds.length} staff record${
        selectedUnregisteredIds.length === 1 ? "" : "s"
      }? These staff members will no longer be able to register.`,
      { danger: true },
    );

    if (!confirmed) return;

    setBulkDeletingUnregistered(true);
    setUnregisteredError("");

    const results = await Promise.all(
      selectedUnregisteredIds.map(async (id) => {
        try {
          const response = await fetch(`/api/accounts/staff-records/${id}`, {
            method: "DELETE",
          });
          return { id, ok: response.ok || response.status === 204 };
        } catch {
          return { id, ok: false };
        }
      }),
    );

    const deletedIds = new Set(
      results.filter((result) => result.ok).map((result) => result.id),
    );
    const failedCount = results.filter((result) => !result.ok).length;

    setUnregisteredStaff((current) =>
      current.filter((record) => !deletedIds.has(record.id)),
    );
    setSelectedUnregisteredIds((current) =>
      current.filter((id) => !deletedIds.has(id)),
    );

    if (failedCount > 0) {
      setUnregisteredError(
        `${failedCount} record${failedCount === 1 ? "" : "s"} could not be deleted.`,
      );
    }

    setBulkDeletingUnregistered(false);
  };

  const handleSaveStaff = async () => {
    if (!editingStaff || !editForm) return;

    setSavingEdit(true);
    setEditError("");
    setEditNotice("");

    try {
      const payload = {
        first_name: editForm.first_name.trim(),
        middle_name: editForm.middle_name.trim(),
        last_name: editForm.last_name.trim(),
        is_active: editForm.is_active,
        profile: {
          phone_number: editForm.profile.phone_number.trim(),
          sex: editForm.profile.sex,
          date_of_birth: editForm.profile.date_of_birth || null,
          employment_date: editForm.profile.employment_date || null,
        },
        ...(editingStaff.hasPosting
          ? {
              posting: {
                state: editForm.posting.state
                  ? Number(editForm.posting.state)
                  : undefined,
                department: editForm.posting.department
                  ? Number(editForm.posting.department)
                  : null,
                grade_level: editForm.posting.grade_level
                  ? Number(editForm.posting.grade_level)
                  : undefined,
                rank: editForm.posting.rank
                  ? Number(editForm.posting.rank)
                  : undefined,
                posting_reason: editForm.posting.posting_reason
                  ? Number(editForm.posting.posting_reason)
                  : null,
                start_date: editForm.posting.start_date || undefined,
                end_date: editForm.posting.end_date || null,
                status: editForm.posting.status,
                remarks: editForm.posting.remarks.trim(),
              },
            }
          : {}),
      };

      const response = await fetch(`/api/accounts/staff/${editingStaff.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(responsePayload, "Could not update staff."),
        );
      }

      setEditNotice(responsePayload?.message || "Staff updated successfully.");
      closeEditModal();
      setStaffReloadKey((current) => current + 1);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Could not update staff.",
      );
    } finally {
      setSavingEdit(false);
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
            onClick={openAddStaffModal}
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
              placeholder="Search all staff by name or file no..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
          <div className="flex items-center gap-3">
            {isSearching && loadingStaff && (
              <p className="text-xs text-gray-500">
                Searching across all staff...
              </p>
            )}
            <select
              aria-label="Sort staff by"
              value={staffSort}
              onChange={(event) => {
                setStaffSort(event.target.value as "file_number" | "surname");
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            >
              <option value="file_number">Sort by file number</option>
              <option value="surname">Sort by surname</option>
            </select>
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

        {editNotice && (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {editNotice}
          </div>
        )}

        {!loadingStaff && !staffError && staffList.length === 0 && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-500">
            No staff accounts were found.
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-center text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr className="divide-x divide-gray-200 border-b border-gray-200">
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
                <th className="px-6 py-4 font-medium">Rank</th>
                <th className="px-6 py-4 font-medium">GL</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Cohort</th>
                <th className="px-6 py-4 font-medium">Courses</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => (
                <tr
                  key={staff.id}
                  className="hover:bg-gray-50 transition group divide-x divide-gray-100"
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
                    <div className="flex items-center justify-center gap-3">
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
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {staff.rank}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {staff.gradeLevel}
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[12rem]">
                    {staff.location}
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[12rem]">
                    {staff.department}
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
                  <td className="px-6 py-4 relative">
                    <button
                      onClick={() => setSelectedStaff(staff)}
                      className="text-sm text-[#1a6b3c] font-semibold hover:underline"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => startEditStaff(staff)}
                      aria-label={`Edit ${staff.surname}`}
                      className="text-gray-400 group-hover:text-[#1a6b3c] transition p-1 rounded-full hover:bg-gray-100 ml-2"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(
                          openDropdownId === staff.id ? null : staff.id,
                        );
                      }}
                      className="text-gray-400 group-hover:text-[#1a6b3c] transition p-1 rounded-full hover:bg-gray-100 ml-1"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {openDropdownId === staff.id && (
                      <div className="absolute right-8 mt-2 w-40 bg-white rounded-lg shadow-lg z-10 border border-gray-100 py-1">
                        <button
                          onClick={() => void handleDeleteStaff(staff)}
                          className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
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

        {/* Pagination */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>
            {isSearching
              ? `${filteredStaff.length} matching staff across all records`
              : `Showing ${firstStaffNumber}–${lastStaffNumber} of ${totalStaff} staff`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSearching || !hasPreviousPage || loadingStaff}
              onClick={() => {
                setSearchTerm("");
                setPage((current) => Math.max(1, current - 1));
              }}
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>

            <span className="px-3 py-1 font-medium text-gray-700">
              {isSearching ? "Searching" : `Page ${page} of ${totalPages}`}
            </span>

            <button
              type="button"
              disabled={isSearching || !hasNextPage || loadingStaff}
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

      {/* Unregistered Staff */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-amber-600" />
            <div>
              <h3 className="font-bold text-gray-800">
                Unregistered Staff{" "}
                {unregisteredSupported && (
                  <span className="text-gray-400 font-normal">
                    ({unregisteredHeaderCount})
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Staff records created with a file number, but the staff member
                hasn&apos;t completed self-registration yet.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                placeholder="Search by name or file no..."
                value={unregisteredSearch}
                onChange={(event) => {
                  setUnregisteredSearch(event.target.value);
                  setSelectedUnregisteredIds([]);
                  setUnregisteredPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] sm:w-64"
              />
            </div>

            <select
              aria-label="Sort unregistered staff by"
              value={unregisteredSort}
              onChange={(event) => {
                setUnregisteredSort(
                  event.target.value as "file_number" | "surname",
                );
                setUnregisteredPage(1);
              }}
              className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            >
              <option value="file_number">Sort by file number</option>
              <option value="surname">Sort by surname</option>
            </select>

            {selectedUnregisteredIds.length > 0 && (
              <button
                type="button"
                onClick={() => void handleBulkDeleteUnregistered()}
                disabled={bulkDeletingUnregistered}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {bulkDeletingUnregistered
                  ? "Deleting..."
                  : `Delete ${selectedUnregisteredIds.length} selected`}
              </button>
            )}
          </div>
        </div>

        {loadingUnregistered ? (
          <p className="p-5 text-sm text-gray-500">Loading...</p>
        ) : unregisteredError ? (
          <div className="p-5 text-sm text-red-700">{unregisteredError}</div>
        ) : !unregisteredSupported ? (
          <p className="p-5 text-sm text-gray-500">
            The backend doesn&apos;t support listing unregistered staff
            records yet, so this section can&apos;t show anyone until
            that&apos;s added.
          </p>
        ) : unregisteredStaff.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            Everyone who has a staff record has also registered.
          </p>
        ) : (() => {
            const normalizedUnregisteredSearch = unregisteredSearch
              .trim()
              .toLowerCase();
            const filteredUnregistered = unregisteredSearch.trim()
              ? unregisteredStaff.filter((record) =>
                  [
                    record.file_number,
                    record.first_name,
                    record.last_name,
                    record.middle_name,
                  ]
                    .filter(Boolean)
                    .some((value) =>
                      value!.toLowerCase().includes(normalizedUnregisteredSearch),
                    ),
                )
              : unregisteredStaff;

            if (filteredUnregistered.length === 0) {
              return (
                <p className="p-5 text-sm text-gray-500">
                  No records match &quot;{unregisteredSearch}&quot;.
                </p>
              );
            }

            // Client-side pagination: the staff-records endpoint has no
            // "unregistered-only" filter, so the full set is loaded and filtered
            // here; we page the result for display.
            // In server mode the loaded rows ARE the current page, so use the
            // backend total and don't slice. Otherwise page the filtered set.
            const totalFiltered = unregServerPaged
              ? unregisteredTotal
              : filteredUnregistered.length;
            const totalUnregPages = Math.max(
              1,
              Math.ceil(totalFiltered / pageSize),
            );
            const currentUnregPage = Math.min(unregisteredPage, totalUnregPages);
            const unregStart = (currentUnregPage - 1) * pageSize;
            const pagedUnregistered = unregServerPaged
              ? filteredUnregistered
              : filteredUnregistered.slice(unregStart, unregStart + pageSize);
            const firstUnregNumber = totalFiltered === 0 ? 0 : unregStart + 1;
            const lastUnregNumber = unregServerPaged
              ? unregStart + pagedUnregistered.length
              : Math.min(unregStart + pageSize, totalFiltered);

            const allFilteredSelected = pagedUnregistered.every((record) =>
              selectedUnregisteredIds.includes(record.id),
            );

            return (
              <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#1a6b3c] cursor-pointer"
                          checked={allFilteredSelected}
                          onChange={() => {
                            if (allFilteredSelected) {
                              setSelectedUnregisteredIds((current) =>
                                current.filter(
                                  (id) =>
                                    !pagedUnregistered.some(
                                      (record) => record.id === id,
                                    ),
                                ),
                              );
                            } else {
                              setSelectedUnregisteredIds((current) => [
                                ...new Set([
                                  ...current,
                                  ...pagedUnregistered.map(
                                    (record) => record.id,
                                  ),
                                ]),
                              ]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-5 py-3 font-medium">File No</th>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Sex</th>
                      <th className="px-5 py-3 font-medium">Employment Date</th>
                      <th className="px-5 py-3 font-medium">Rank</th>
                      <th className="px-5 py-3 font-medium">Grade Level</th>
                      <th className="px-5 py-3 font-medium">Department</th>
                      <th className="px-5 py-3 font-medium">Location</th>
                      <th className="px-5 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedUnregistered.map((record) => (
                      <tr
                        key={record.id}
                        className={`bg-amber-50/40 ${
                          selectedUnregisteredIds.includes(record.id)
                            ? "bg-amber-100/60"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#1a6b3c] cursor-pointer"
                            checked={selectedUnregisteredIds.includes(record.id)}
                            onChange={() => {
                              setSelectedUnregisteredIds((current) =>
                                current.includes(record.id)
                                  ? current.filter((id) => id !== record.id)
                                  : [...current, record.id],
                              );
                            }}
                          />
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-700">
                          {record.file_number}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          {[record.first_name, record.middle_name, record.last_name]
                            .filter(Boolean)
                            .join(" ") || "Not registered"}
                        </td>
                        <td className="px-5 py-3 text-gray-600 capitalize">
                          {record.sex || "Not assigned"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {record.employment_date || "Not assigned"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {record.rank?.title ?? "Not assigned"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {record.grade_level?.code ?? "Not assigned"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {record.department?.name ?? "Not assigned"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {record.state?.name ?? "Not assigned"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => startEditUnregisteredStaff(record)}
                              aria-label={`Edit ${record.file_number}`}
                              className="text-[#1a6b3c]"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteUnregisteredStaff(record)
                              }
                              disabled={deletingUnregisteredId === record.id}
                              aria-label={`Delete ${record.file_number}`}
                              className="text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 p-5 text-sm text-gray-500">
                <p>
                  Showing {firstUnregNumber}–{lastUnregNumber} of{" "}
                  {totalFiltered}
                  {unregisteredSearch.trim() ? " matching" : ""} record
                  {totalFiltered === 1 ? "" : "s"}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentUnregPage <= 1}
                    onClick={() =>
                      setUnregisteredPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <span className="px-3 py-1 font-medium text-gray-700">
                    Page {currentUnregPage} of {totalUnregPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentUnregPage >= totalUnregPages}
                    onClick={() =>
                      setUnregisteredPage((current) =>
                        Math.min(totalUnregPages, current + 1),
                      )
                    }
                    className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
              </>
            );
          })()}
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
                    Department
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-[#1a6b3c]" />{" "}
                    {selectedStaff.department}
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
                  <button
                    onClick={() => startEditStaff(selectedStaff)}
                    className="flex-1 bg-[#1a6b3c] hover:bg-[#145530] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                  >
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

      {/* Edit Staff Modal */}
      {editingStaff && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  Edit Staff Record
                </h3>
                <p className="text-xs text-gray-500">
                  File number and email cannot be changed here.
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {editError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <section className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-800">Staff details</h4>
                  <p className="text-xs text-gray-500">
                    Update the visible staff names and account status.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-medium text-gray-700">
                    First name
                    <input
                      value={editForm.first_name}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          first_name: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Middle name
                    <input
                      value={editForm.middle_name}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          middle_name: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Last name
                    <input
                      value={editForm.last_name}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          last_name: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        is_active: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#1a6b3c]"
                  />
                  Account is active
                </label>
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                <div>
                  <h4 className="font-bold text-gray-800">Profile</h4>
                  <p className="text-xs text-gray-500">
                    Admin can update profile information connected to the staff
                    account.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Phone number
                    <input
                      value={editForm.profile.phone_number}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          profile: {
                            ...editForm.profile,
                            phone_number: event.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    />
                  </label>

                  <div className="text-sm font-medium text-gray-700">
                    Profile picture
                    <div className="mt-1 flex items-center gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-gray-100 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            editForm.profile.profile_picture_url ||
                            "/1-blank-profile.png"
                          }
                          alt="Profile preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c]">
                        <Camera size={16} />
                        {uploadingEditPhoto
                          ? "Uploading..."
                          : "Change photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingEditPhoto}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";

                            if (!file) return;

                            if (!file.type.startsWith("image/")) {
                              setEditError("Please choose an image file.");
                              return;
                            }

                            setUploadingEditPhoto(true);
                            setEditError("");

                            try {
                              const uploaded = await uploadFileToCloudinary(
                                file,
                                undefined,
                                "course",
                              );
                              setEditForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      profile: {
                                        ...current.profile,
                                        profile_picture_url:
                                          uploaded.secure_url,
                                      },
                                    }
                                  : current,
                              );
                            } catch (uploadError) {
                              setEditError(
                                uploadError instanceof Error
                                  ? uploadError.message
                                  : "Could not upload the profile picture.",
                              );
                            } finally {
                              setUploadingEditPhoto(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="mt-1 text-xs font-normal text-gray-500">
                      Upload a new photo. It is saved when you save the staff
                      profile.
                    </p>
                  </div>

                  <label className="text-sm font-medium text-gray-700">
                    Sex
                    <select
                      value={editForm.profile.sex}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          profile: {
                            ...editForm.profile,
                            sex: event.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    >
                      <option value="">Not set</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                {!editingStaff.hasPosting ? (
                  <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                    This staff member does not have a current posting yet, so
                    posting fields cannot be updated here.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-gray-700">
                      Location
                      <select
                        value={editForm.posting.state}
                        disabled={loadingOrgOptions}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            posting: {
                              ...editForm.posting,
                              state: event.target.value,
                              department: "",
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                      >
                        <option value="">Select location</option>
                        {orgOptions.states.map((option) => (
                          <option key={option.id} value={String(option.id)}>
                            {optionLabel(option, "Location")}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isHqLocation(editForm.posting.state, orgOptions.states) && (
                      <label className="text-sm font-medium text-gray-700">
                        Department
                        <select
                          value={editForm.posting.department}
                          disabled={loadingOrgOptions}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              posting: {
                                ...editForm.posting,
                                department: event.target.value,
                              },
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                        >
                          <option value="">No department</option>
                          {orgOptions.departments.map((option) => (
                            <option key={option.id} value={String(option.id)}>
                              {option.short_form
                                ? `${option.short_form} - ${optionLabel(
                                    option,
                                    "Department",
                                  )}`
                                : optionLabel(option, "Department")}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="text-sm font-medium text-gray-700">
                      Grade level
                      <select
                        value={editForm.posting.grade_level}
                        disabled={loadingOrgOptions}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            posting: {
                              ...editForm.posting,
                              grade_level: event.target.value,
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                      >
                        <option value="">Select grade level</option>
                        {orgOptions.gradeLevels.map((option) => (
                          <option key={option.id} value={String(option.id)}>
                            {option.code ||
                              (option.level ? `GL-${option.level}` : "") ||
                              optionLabel(option, "Grade level")}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium text-gray-700">
                      Rank
                      <select
                        value={editForm.posting.rank}
                        disabled={loadingOrgOptions}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            posting: {
                              ...editForm.posting,
                              rank: event.target.value,
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                      >
                        <option value="">Select rank</option>
                        {orgOptions.ranks.map((option) => (
                          <option key={option.id} value={String(option.id)}>
                            {optionLabel(option, "Rank")}
                          </option>
                        ))}
                      </select>
                    </label>

                  </div>
                )}
              </section>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50 shrink-0">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaff}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] hover:bg-[#145530] shadow-sm transition disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  Add Staff Record
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Create the staff record first. The staff can register later
                  with their file number.
                </p>
              </div>
              <button
                onClick={closeAddStaffModal}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Form) */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {addStaffError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {addStaffError}
                </div>
              )}

              {addStaffNotice && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {addStaffNotice}
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Number
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={staffRecordForm.file_number}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        file_number: event.target.value,
                      })
                    }
                    placeholder="e.g. TS0012"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] uppercase"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Backend currently allows a maximum of 6 characters.
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={staffRecordForm.first_name}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        first_name: event.target.value,
                      })
                    }
                    placeholder="e.g. Sulaiman"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] capitalize"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={staffRecordForm.middle_name}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        middle_name: event.target.value,
                      })
                    }
                    placeholder="Optional"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surname
                  </label>
                  <input
                    type="text"
                    value={staffRecordForm.last_name}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        last_name: event.target.value,
                      })
                    }
                    placeholder="e.g. Abba"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] capitalize"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sex
                  </label>
                  <select
                    value={staffRecordForm.sex}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        sex: event.target.value as StaffRecordForm["sex"],
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select sex...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={staffRecordForm.state}
                    disabled={loadingOrgOptions}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        state: event.target.value,
                        department: "",
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select location...</option>
                    {orgOptions.states.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {optionLabel(option, "Location")}
                      </option>
                    ))}
                  </select>
                </div>
                {isHqLocation(staffRecordForm.state, orgOptions.states) && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={staffRecordForm.department}
                      disabled={loadingOrgOptions}
                      onChange={(event) =>
                        setStaffRecordForm({
                          ...staffRecordForm,
                          department: event.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    >
                      <option value="">Select department...</option>
                      {orgOptions.departments.map((option) => (
                        <option key={option.id} value={String(option.id)}>
                          {optionLabel(option, "Department")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level
                  </label>
                  <select
                    value={staffRecordForm.grade_level}
                    disabled={loadingOrgOptions}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        grade_level: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select grade level...</option>
                    {orgOptions.gradeLevels.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {optionLabel(option, "Grade")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rank
                  </label>
                  <select
                    value={staffRecordForm.rank}
                    disabled={loadingOrgOptions}
                    onChange={(event) =>
                      setStaffRecordForm({
                        ...staffRecordForm,
                        rank: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select rank...</option>
                    {orgOptions.ranks.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {optionLabel(option, "Rank")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  onClick={closeAddStaffModal}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStaffRecord}
                  disabled={creatingStaffRecord}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] hover:bg-[#145530] shadow-sm transition disabled:opacity-50"
                >
                  {creatingStaffRecord ? "Saving..." : "Save Staff Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Unregistered Staff Modal */}
      {editingUnregisteredId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  Edit Staff Record
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  File number cannot be changed here.
                </p>
              </div>
              <button
                onClick={closeUnregisteredEditModal}
                className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-full p-2 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {unregisteredEditError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {unregisteredEditError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Number
                  </label>
                  <input
                    type="text"
                    value={unregisteredEditForm.file_number}
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={unregisteredEditForm.first_name}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        first_name: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] capitalize"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={unregisteredEditForm.middle_name}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        middle_name: event.target.value,
                      })
                    }
                    placeholder="Optional"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surname
                  </label>
                  <input
                    type="text"
                    value={unregisteredEditForm.last_name}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        last_name: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] capitalize"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sex
                  </label>
                  <select
                    value={unregisteredEditForm.sex}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        sex: event.target.value as StaffRecordForm["sex"],
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select sex...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={unregisteredEditForm.date_of_birth}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        date_of_birth: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={unregisteredEditForm.state}
                    disabled={loadingOrgOptions}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        state: event.target.value,
                        department: "",
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select location...</option>
                    {orgOptions.states.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {optionLabel(option, "Location")}
                      </option>
                    ))}
                  </select>
                </div>
                {isHqLocation(unregisteredEditForm.state, orgOptions.states) && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={unregisteredEditForm.department}
                      disabled={loadingOrgOptions}
                      onChange={(event) =>
                        setUnregisteredEditForm({
                          ...unregisteredEditForm,
                          department: event.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    >
                      <option value="">Select department...</option>
                      {orgOptions.departments.map((option) => (
                        <option key={option.id} value={String(option.id)}>
                          {optionLabel(option, "Department")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level
                  </label>
                  <select
                    value={unregisteredEditForm.grade_level}
                    disabled={loadingOrgOptions}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        grade_level: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select grade level...</option>
                    {orgOptions.gradeLevels.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {optionLabel(option, "Grade")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rank
                  </label>
                  <select
                    value={unregisteredEditForm.rank}
                    disabled={loadingOrgOptions}
                    onChange={(event) =>
                      setUnregisteredEditForm({
                        ...unregisteredEditForm,
                        rank: event.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  >
                    <option value="">Select rank...</option>
                    {orgOptions.ranks.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {optionLabel(option, "Rank")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  onClick={closeUnregisteredEditModal}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveUnregisteredStaff()}
                  disabled={savingUnregisteredEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a6b3c] hover:bg-[#145530] shadow-sm transition disabled:opacity-50"
                >
                  {savingUnregisteredEdit ? "Saving..." : "Save Changes"}
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
                      Select {targetLabel}
                    </label>
                    <select
                      id="cohort-select"
                      value={selectedCohort}
                      onChange={(e) => setSelectedCohort(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
                    >
                      <option value="">
                        {loadingCohorts
                          ? "Loading..."
                          : `Select ${targetLabel}...`}
                      </option>

                      {assignTargets.map((target) => (
                        <option key={target.id} value={String(target.id)}>
                          {target.label}
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
                      Select {targetLabel}
                    </label>
                    <select
                      id="cohort-select"
                      value={selectedCohort}
                      onChange={(e) => setSelectedCohort(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent"
                    >
                      <option value="">
                        {loadingCohorts
                          ? "Loading..."
                          : `Select ${targetLabel}...`}
                      </option>

                      {assignTargets.map((target) => (
                        <option key={target.id} value={String(target.id)}>
                          {target.label}
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
                        {programmeMode &&
                          " Each newly enrolled staff member is notified by email (and SMS where available)."}
                      </p>
                    </div>
                  </div>

                  {programmeMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or assign a whole department
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <select
                          value={selectedDepartment}
                          onChange={(event) =>
                            setSelectedDepartment(event.target.value)
                          }
                          className="w-full flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                        >
                          <option value="">Select department...</option>
                          {orgOptions.departments.map((department) => (
                            <option
                              key={department.id}
                              value={String(department.id)}
                            >
                              {department.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleDepartmentAssign}
                          disabled={
                            bulkAssigning ||
                            !selectedCohort ||
                            !selectedDepartment
                          }
                          className="shrink-0 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#145530] disabled:opacity-50"
                        >
                          {bulkAssigning ? "Assigning..." : "Assign Department"}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Enrolls every active staff member of the department into
                        the selected course. Staff already enrolled are
                        skipped.
                      </p>
                    </div>
                  )}

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
                  {assigningStaff
                    ? "Assigning..."
                    : `Assign to ${targetLabel}`}
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

      {dialog}
    </div>
  );
}
