"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Trash2, Users, X } from "lucide-react";
import { extractErrorMessage, readApiList } from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";

type ResourceKey = "ranks" | "grade-levels" | "states" | "departments";

type Item = {
  id: number;
  title?: string;
  code?: string;
  level?: number;
  name?: string;
  short_form?: string;
  description?: string;
};

type BlockingStaffEntry = {
  file_number?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
};

type BlockingStaffNotice = {
  itemLabel: string;
  staff: BlockingStaffEntry[];
};

function extractBlockingStaff(payload: unknown): BlockingStaffEntry[] | null {
  if (!payload || typeof payload !== "object") return null;

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;

  const list = (data as { blocking_staff?: unknown }).blocking_staff;
  return Array.isArray(list) ? (list as BlockingStaffEntry[]) : null;
}

function blockingStaffLabel(entry: BlockingStaffEntry) {
  return (
    entry.name ||
    [entry.first_name, entry.last_name].filter(Boolean).join(" ") ||
    entry.file_number ||
    "Unknown staff"
  );
}

const RESOURCES: { key: ResourceKey; label: string }[] = [
  { key: "ranks", label: "Ranks" },
  { key: "grade-levels", label: "Grade Levels (GL)" },
  { key: "states", label: "Locations" },
  { key: "departments", label: "Departments" },
];

// StaffRecord field cleared to unblock deletion of an in-use org-data item.
const STAFF_RECORD_FIELD: Record<ResourceKey, string> = {
  ranks: "rank",
  "grade-levels": "grade_level",
  states: "state",
  departments: "department",
};

async function findStaffRecordIds(fileNumbers: string[]): Promise<Map<string, number>> {
  const wanted = new Set(fileNumbers);
  const found = new Map<string, number>();
  let page = 1;
  let hasMore = true;

  while (hasMore && found.size < wanted.size) {
    const response = await fetch(
      `/api/accounts/staff-records?page=${page}&page_size=100`,
      { cache: "no-store" },
    );
    if (!response.ok) break;

    const payload = (await response.json().catch(() => null)) as {
      data?: { results?: { id: number; file_number: string }[]; next?: string | null };
    } | null;

    for (const record of payload?.data?.results ?? []) {
      if (wanted.has(record.file_number)) found.set(record.file_number, record.id);
    }

    hasMore = Boolean(payload?.data?.next);
    page += 1;
  }

  return found;
}

async function tryAutoUnassign(
  resource: ResourceKey,
  blockingList: BlockingStaffEntry[],
): Promise<boolean> {
  const field = STAFF_RECORD_FIELD[resource];
  if (!field) return false;

  const fileNumbers = blockingList
    .map((entry) => entry.file_number)
    .filter((value): value is string => Boolean(value));
  if (fileNumbers.length !== blockingList.length) return false;

  const idsByFileNumber = await findStaffRecordIds(fileNumbers);
  if (idsByFileNumber.size !== fileNumbers.length) return false;

  const unassignResults = await Promise.all(
    fileNumbers.map((fileNumber) =>
      fetch(`/api/accounts/staff-records/${idsByFileNumber.get(fileNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: null }),
      }),
    ),
  );

  return unassignResults.every((response) => response.ok);
}

const FIELD_CONFIG: Record<ResourceKey, { name: keyof Item; placeholder: string; type?: string }[]> = {
  ranks: [
    { name: "title", placeholder: "Rank title, e.g. ACCOUNTANT I" },
    { name: "description", placeholder: "Description (optional)" },
  ],
  "grade-levels": [
    { name: "code", placeholder: "Code, e.g. GL08" },
    { name: "level", placeholder: "Level number, e.g. 8", type: "number" },
    { name: "description", placeholder: "Description (optional)" },
  ],
  states: [
    { name: "name", placeholder: "Location name, e.g. Lagos" },
    { name: "code", placeholder: "Code, e.g. LA" },
  ],
  departments: [
    { name: "name", placeholder: "Department name" },
    { name: "short_form", placeholder: "Short form, e.g. ICT" },
    { name: "description", placeholder: "Description (optional)" },
  ],
};

const emptyForm: Item = { id: 0 };

export default function OrganizationDataPage() {
  const { confirm, dialog } = useConfirm();
  const [resource, setResource] = useState<ResourceKey>("ranks");
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<Item>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [blockingStaff, setBlockingStaff] = useState<BlockingStaffNotice | null>(
    null,
  );

  const loadItems = useCallback(async (key: ResourceKey) => {
    try {
      const response = await fetch(`/api/organization/${key}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Could not load data."));
      }

      setItems(readApiList<Item>(payload));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadItems(resource);
    };

    void fetchData();
  }, [resource, loadItems]);

  const fields = FIELD_CONFIG[resource];

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const switchResource = (key: ResourceKey) => {
    setResource(key);
    resetForm();
    setNotice("");
    setLoading(true);
  };

  const startEdit = (item: Item) => {
    setForm(item);
    setEditingId(item.id);
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const value = form[field.name];
      body[field.name as string] =
        field.type === "number" ? Number(value) : value || undefined;
    }

    try {
      const response = await fetch(
        editingId ? `/api/organization/${resource}/${editingId}` : `/api/organization/${resource}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = response.status === 204 ? null : await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Could not save."));
      }

      setNotice(editingId ? "Updated." : "Added.");
      resetForm();
      await loadItems(resource);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    const confirmed = await confirm(
      `Delete ${item.title ?? item.name ?? item.code}?`,
      { danger: true },
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setBlockingStaff(null);

    try {
      let response = await fetch(`/api/organization/${resource}/${item.id}`, {
        method: "DELETE",
      });
      let payload = response.status === 204 ? null : await response.json().catch(() => null);

      if (!response.ok) {
        const blockingList = extractBlockingStaff(payload);

        if (blockingList && blockingList.length > 0) {
          const unassigned = await tryAutoUnassign(resource, blockingList);

          if (unassigned) {
            response = await fetch(`/api/organization/${resource}/${item.id}`, {
              method: "DELETE",
            });
            payload = response.status === 204 ? null : await response.json().catch(() => null);

            if (response.ok) {
              setNotice(
                `Deleted. ${blockingList.length} staff record${blockingList.length === 1 ? "" : "s"} automatically unassigned.`,
              );
              setItems((current) => current.filter((existing) => existing.id !== item.id));
              return;
            }
          }

          setBlockingStaff({
            itemLabel: String(item.title ?? item.name ?? item.code ?? "this item"),
            staff: blockingList,
          });
          return;
        }

        if (response.status === 500) {
          throw new Error(
            `Could not delete "${item.title ?? item.name ?? item.code}" — it's likely still assigned to one or more staff records. Remove it from those staff first, then try again.`,
          );
        }

        throw new Error(extractErrorMessage(payload, "Could not delete."));
      }

      setNotice("Deleted.");
      setItems((current) => current.filter((existing) => existing.id !== item.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Organization Data</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage Ranks, Grade Levels, Locations, and Departments used when posting staff.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RESOURCES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => switchResource(r.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              resource === r.key
                ? "bg-[#1a6b3c] text-white"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

      <button
        type="button"
        onClick={() => (showForm ? resetForm() : setShowForm(true))}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white"
      >
        <Plus size={18} />
        {showForm ? "Close form" : `Add ${resource}`}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm">
          {fields.map((field) => (
            <input
              key={field.name}
              required={field.name !== "description"}
              type={field.type ?? "text"}
              value={(form[field.name] as string | number | undefined) ?? ""}
              onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
              placeholder={field.placeholder}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
            />
          ))}

          <button
            disabled={saving}
            className="rounded-lg bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update" : "Save"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No entries yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Entry</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-4 text-gray-700">
                    {item.title ?? item.name}
                    {item.code ? ` (${item.code})` : ""}
                    {item.short_form ? ` (${item.short_form})` : ""}
                    {item.level !== undefined ? ` — level ${item.level}` : ""}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => startEdit(item)} className="text-[#1a6b3c]">
                        <Edit3 size={17} />
                      </button>
                      <button type="button" onClick={() => void handleDelete(item)} className="text-red-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {blockingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Users size={18} className="text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Can&apos;t delete</h3>
                  <p className="text-xs text-gray-500">
                    &quot;{blockingStaff.itemLabel}&quot; is still assigned to{" "}
                    {blockingStaff.staff.length} staff member
                    {blockingStaff.staff.length === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockingStaff(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
              {blockingStaff.staff.map((entry, index) => (
                <div
                  key={entry.file_number ?? index}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-700">
                    {blockingStaffLabel(entry)}
                  </span>
                  {entry.file_number && (
                    <span className="text-xs text-gray-400">
                      {entry.file_number}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Reassign or remove these staff from &quot;{blockingStaff.itemLabel}
              &quot; first, then try deleting it again.
            </p>

            <button
              type="button"
              onClick={() => setBlockingStaff(null)}
              className="mt-4 w-full rounded-xl bg-[#1a6b3c] px-5 py-2.5 text-sm font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {dialog}
    </div>
  );
}
