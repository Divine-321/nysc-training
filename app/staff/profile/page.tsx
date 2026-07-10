"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MapPin, Briefcase, Hash, BookOpen, ShieldCheck, Phone, Mail, Edit2, Save, X, Camera } from "lucide-react";
import type { AuthUser } from "@/app/lib/portal-api";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  resolveMediaUrl,
} from "@/app/lib/portal-api";
import CameraCaptureModal, {
  dataUrlToFile,
} from "@/app/components/CameraCaptureModal";

type CohortStaffAssignment = {
  id: number;
  cohort: number;
  cohort_name: string;
  staff: number;
};

type CourseEnrollment = {
  id: number;
  cohort_name: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

type CurrentPosting = {
  id: number;
  state: {
    name: string;
    code: string;
  } | null;
  department: {
    name: string;
  } | null;
  grade_level: {
    code: string;
    level?: number;
  } | null;
  rank: {
    title: string;
  } | null;
  status: "active" | "retired";
};

export default function StaffProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const emptyProfileData = {
  photo: "/1-blank-profile.png",
  fileNo: "",
  surname: "",
  otherNames: "",
  rank: "",
  gradeLevel: "Not assigned",
  location: "Not assigned",
  cohort: "Not assigned",
  coursesAttended: 0,
  completedCourses: 0,
  status: "",
  phone: "",
  email: "",
};

const [staffData, setStaffData] = useState(emptyProfileData);
const [formData, setFormData] = useState(emptyProfileData);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/accounts/me", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const user = payload?.data as AuthUser | undefined;
      if (!user) return;

      const cohortResponse = await fetch("/api/training/cohort-staff", {
        cache: "no-store",
      });
      const enrollmentResponse = await fetch("/api/training/enrollments", {
        cache: "no-store",
      });
      const postingResponse = await fetch("/api/organization/postings/current", {
        cache: "no-store",
      });

      const cohortPayload = cohortResponse.ok
        ? await cohortResponse.json().catch(() => null)
        : null;
      const enrollmentPayload = enrollmentResponse.ok
        ? await enrollmentResponse.json().catch(() => null)
        : null;
      const postingPayload = postingResponse.ok
        ? await postingResponse.json().catch(() => null)
        : null;

      const currentPosting = readApiItem<CurrentPosting>(postingPayload);
      const enrollments = readApiList<CourseEnrollment>(enrollmentPayload);
      let cohortNames = readApiList<CohortStaffAssignment>(cohortPayload)
        .filter((assignment) => assignment.staff === user.id)
        .map((assignment) => assignment.cohort_name);

      if (cohortNames.length === 0) {
        cohortNames = enrollments
          .map((enrollment) => enrollment.cohort_name)
          .filter((name): name is string => Boolean(name));
      }

      const locationParts = [
        currentPosting?.state?.name,
        currentPosting?.department?.name,
      ].filter(Boolean);

      const nextData = {
        photo: resolveMediaUrl(user.profile?.profile_picture_url),
        fileNo: user.file_number || "Not assigned",
        surname: user.last_name,
        otherNames: [user.first_name, user.middle_name].filter(Boolean).join(" "),
        rank: currentPosting?.rank?.title || "Not assigned",
        gradeLevel: currentPosting?.grade_level?.code || "Not assigned",
        location: locationParts.join(" • ") || "Not assigned",
        cohort: [...new Set(cohortNames)].join(", ") || "Not assigned",
        coursesAttended: enrollments.length,
        completedCourses: enrollments.filter(
          (enrollment) => enrollment.status === "COMPLETED",
        ).length,
        status: user.is_active ? "Active" : "Inactive",
        phone: user.profile?.phone_number || "",
        email: user.email,
      };

      setStaffData(nextData);
      setFormData(nextData);
    };

    void loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/accounts/me/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            phone_number: formData.phone,
          },
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not update profile."),
        );
      }

      setStaffData({ ...formData });
      setIsEditing(false);
      setMessage("Profile updated successfully.");
      window.dispatchEvent(new Event("nysc-profile-updated"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Photos must be captured live with the camera (no device uploads): the
  // registered photo is what exam identity verification compares against.
  const handlePhotoCapture = async (imageDataUrl: string) => {
    const file = dataUrlToFile(imageDataUrl, "profile-photo.jpg");

    setUploadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const uploadPayload = new FormData();
      uploadPayload.set("profile_picture_url", file);
      uploadPayload.set("profile.profile_picture_url", file);

      const response = await fetch("/api/accounts/me/update", {
        method: "PATCH",
        body: uploadPayload,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not update profile picture."),
        );
      }

      const currentUserResponse = await fetch("/api/accounts/me", {
        cache: "no-store",
      });
      const currentUserPayload = currentUserResponse.ok
        ? await currentUserResponse.json().catch(() => null)
        : null;
      const updatedUser = currentUserPayload?.data as AuthUser | undefined;
      const profilePictureUrl = updatedUser?.profile?.profile_picture_url;

      if (!profilePictureUrl) {
        throw new Error(
          "The upload was accepted, but the backend did not save a profile picture URL.",
        );
      }

      const nextPhoto = `${resolveMediaUrl(profilePictureUrl)}?v=${Date.now()}`;

      setStaffData((current) => ({ ...current, photo: nextPhoto }));
      setFormData((current) => ({ ...current, photo: nextPhoto }));
      setMessage("Profile picture updated successfully.");
      setShowPhotoModal(false);
      window.dispatchEvent(new Event("nysc-profile-updated"));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not update profile picture.",
      );
    } finally {
      setUploadingPhoto(false);
    }
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

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

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
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => setShowPhotoModal(true)}
                className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition"
              >
                <Camera size={24} />
                <span className="text-xs mt-1 font-medium">
                  {uploadingPhoto ? "Uploading..." : "Take photo"}
                </span>
              </button>
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
              <div className="rounded-lg bg-gray-50 p-3 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Name
                </p>
                <p className="mt-1 font-semibold text-gray-800">
                  {[staffData.otherNames, staffData.surname]
                    .filter(Boolean)
                    .join(" ") || "Not assigned"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Names come from your staff record and cannot be edited here.
                </p>
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
                  disabled={saving}
                  className="text-sm font-semibold text-white flex items-center gap-1 bg-[#1a6b3c] hover:bg-[#145530] px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                >
                  <Save size={16} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8">
            {/* Email */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0 border border-gray-100">
                <Mail size={20} />
              </div>
              <div className="flex flex-col justify-center w-full">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                <p className="font-bold text-gray-800 truncate">{staffData.email}</p>
                {isEditing && (
                  <p className="mt-1 text-xs text-gray-500">
                    Use the email change flow in settings when enabled.
                  </p>
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
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#1a6b3c] shrink-0 border border-green-100">
                <ShieldCheck size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cohort</p>
                <p className="font-bold text-gray-800">{staffData.cohort}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <BookOpen size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Enrolled Courses</p>
                <p className="font-extrabold text-blue-700 text-lg leading-none">{staffData.coursesAttended}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#1a6b3c] shrink-0 border border-green-100">
                <ShieldCheck size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Courses</p>
                <p className="font-extrabold text-[#1a6b3c] text-lg leading-none">{staffData.completedCourses}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPhotoModal && (
        <CameraCaptureModal
          title="Update profile photo"
          description="Profile photos must be taken with your camera. This photo is used to verify your identity before assessments."
          busy={uploadingPhoto}
          onCapture={handlePhotoCapture}
          onCancel={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  );
}
