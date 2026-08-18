"use client";

import { useState } from "react";
import { readApiList } from "@/app/lib/portal-api";
import { cachedFetch, LONG_TTL_MS } from "@/app/lib/data-cache";

const ranks = [
  "ACCOUNTANT I", "ACCOUNTANT II", "ADMIN OFFICER I", "ADMIN OFFICER II",
  "AGRIC OFFICER I", "AGRIC OFFICER II",
  "ASSISTANT EXECUTIVE OFFICER (INFOR & PR)", "ASSISTANT DIRECTOR",
  "ASSISTANT DIRECTOR (ADMIN)", "ASSISTANT DIRECTOR (AGRIC)",
  "ASSISTANT DIRECTOR (INFOR & PRO)", "ASSISTANT DIRECTOR (INTERNAL AUDIT)",
  "ASSISTANT DIRECTOR (LEGAL)", "ASSISTANT DIRECTOR (MED-LAB)",
  "ASSISTANT DIRECTOR (PROCUREMENT)",
  "ASSISTANT DIRECTOR (PROGRAMME/SYSTEM ANALYST)",
  "ASSISTANT DIRECTOR (ACCOUNTANT)", "ASSISTANT DIRECTOR (STATISTICIAN)",
  "ASSISTANT CHIEF (ACCOUNTANT)", "ASSISTANT CHIEF (INTERNAL AUDIT)",
  "ASSISTANT CHIEF (ADMIN OFFICER)", "ASSISTANT CHIEF (AGRIC OFFICER)",
  "ASSISTANT CHIEF (AGRIC SUPR)", "ASSISTANT CHIEF (CONFIDENTIAL SECRETARY)",
  "ASSISTANT CHIEF EXECUTIVE OFFICER (LIB)",
  "ASSISTANT CHIEF EXECUTIVE OFFICER (INFOR & PR)",
  "ASSISTANT CHIEF EXECUTIVE OFFICER (ACCOUNTANT)",
  "ASSISTANT CHIEF EXECUTIVE OFFICER (GD)",
  "ASSISTANT CHIEF (GRAPHIC OFFICER)", "ASSISTANT CHIEF (INFO OFFICER)",
  "ASSISTANT CHIEF (INSPECTOR)", "ASSISTANT CHIEF (LEGAL OFFICER)",
  "ASSISTANT CHIEF (PROCUREMENT OFFICER)",
  "ASSISTANT CHIEF (PROGRAMME/SYSTEM ANALYST)",
  "ASSISTANT CHIEF (SECRETARY ASSISTANT)", "ASSISTANT CHIEF (STORE OFFICER)",
  "ASSISTANT CHIEF (TECH OFFICER)", "ASSISTANT EXECUTIVE OFFICER ACCOUNTANT",
  "ASSISTANT STORE OFFICER", "ASSISTANT EXECUTIVE OFFICER (GD)",
  "ASSISTANT PROGRAMME OFFICER", "CHIEF ACCOUNTANT",
  "CHIEF ACCOUNTANT (INTERNAL AUDIT)", "CHIEF ADMIN OFFICER",
  "CHIEF AGRIC OFFICER", "CHIEF AGRIC SUPR", "CHIEF CATERING OFFICER",
  "CHIEF CLERICAL OFFICER", "CHIEF CONFIDENTIAL OFFICER",
  "CHIEF DRIVER MECH", "CHIEF ENV HEALTH OFFICER",
  "CHIEF EXECUTIVE OFFICER (ACCOUNTANT)",
  "CHIEF EXECUTIVE OFFICER (INFOR & PR)", "CHIEF EXECUTIVE OFFICER (GD)",
  "CHIEF GRAPHIC OFFICER", "CHIEF INFOR & PRO", "CHIEF INSPECTOR",
  "CHIEF NURSING OFFICER", "CHIEF PROGRAMME/SYSTEM ANALYST",
  "CHIEF PROGRAMME OFFICER", "CHIEF RADIO/TEL SUPERVISOR",
  "CHIEF SECRETARY ASSISTANT", "CHIEF STORE KEEPER", "CHIEF STORE OFFICER",
  "CHIEF TAILOR (SUPERVISOR)", "CHIEF TECH OFFICER", "CHIEF TECH ASSISTANT",
  "CLERICAL ASSISTANT", "CLERICAL OFFICER II", "CLERICAL OFFICER I",
  "CONFIDENTIAL SECRETARY I", "CONFIDENTIAL SECRETARY II",
  "CONFIDENTIAL SECRETARY III", "DEPUTY DIRECTOR", "DIRECTOR",
  "EXECUTIVE OFFICER (ACCOUNTANT)", "EXECUTIVE OFFICER (GD)",
  "HIGHER AGRIC SUPR", "HIGHER EXECUTIVE OFFICER (GD)",
  "HIGHER PROGRAMME ASSISTANT", "HIGHER PROGRAMME OFFICER",
  "HIGHER STORE OFFICER", "HIGHER TECH OFFICER", "HIGHER WORK SUPR",
  "IPRO I", "IPRO II", "INSPECTOR II", "LEGAL OFFICER I", "LEGAL OFFICER II",
  "MOTOR DRIVER", "MOTOR DRIVER MECH", "PRINCIPAL ACCOUNTANT",
  "PRINCIPAL ACCOUNTANT (INTERNAL AUDIT)", "PRINCIPAL ADMIN OFFICER",
  "PRINCIPAL AGRIC OFFICER", "PRINCIPAL AGRIC SUPR I",
  "PRINCIPAL CONFIDENTIAL SECRETARY I", "PRINCIPAL EXECUTIVE OFFICER I (GD)",
  "PRINCIPAL EXECUTIVE OFFICER I (PROCUREMENT)",
  "PRINCIPAL EXECUTIVE OFFICER II (GD)",
  "PRINCIPAL EXECUTIVE OFFICER II (PROCUREMENT)",
  "PRINCIPAL EXECUTIVE OFFICER I (INFOR & PR)",
  "PRINCIPAL EXECUTIVE OFFICER I (ACCOUNTANT)",
  "PRINCIPAL EXECUTIVE OFFICER II (ACCOUNTANT)", "PRINCIPAL INFOR & PRO",
  "PRINCIPAL INSPECTOR", "PRINCIPAL PROCUREMENT OFFICER",
  "PRINCIPAL STATISTICIAN I", "PRINCIPAL STORE OFFICER I",
  "PRINCIPAL STORE OFFICER II", "PRINCIPAL PROCUREMENT OFFICER I",
  "PRINCIPAL PROCUREMENT OFFICER II", "PRINCIPAL PROGRAMME OFFICER I",
  "PRINCIPAL PROGRAMME OFFICER II", "PRINCIPAL PROGRAMME/SYSTEM ANALYST",
  "SECRETARY ASSISTANT II", "SECRETARY ASSISTANT I", "SENIOR ACCOUNTANT",
  "SENIOR ADMIN OFFICER", "SENIOR CLERICAL OFFICER",
  "SENIOR CONFIDENTIAL SECRETARY", "SENIOR EXECUTIVE OFFICER (ACCOUNTANT)",
  "SENIOR EXECUTIVE OFFICER (GD)", "SENIOR EXECUTIVE OFFICER (PROCUREMENT)",
  "SENIOR FOREMAN", "SENIOR LEGAL OFFICER", "SENIOR MOTOR DRIVER/MECH I",
  "SENIOR PROGRAMME/SYSTEM ANALYST", "SENIOR TECH ASSISTANT II",
  "SENIOR WORKS SUPR", "SENIOR AGRIC SUPR", "SENIOR EXECUTIVE (INFOR & PR)",
  "SENIOR INSPECTOR", "SENIOR PROCUREMENT OFFICER",
  "SENIOR SECRETARY ASSISTANT II", "SENIOR STORE OFFICER",
  "SENIOR SUPPLIES OFFICER", "SENIOR TECH OFFICER", "STORE OFFICER",
  "STORE KEEPER", "STORE ASSISTANT", "TECH ASSISTANT",
  "WORK SUPERINTENDENT",
];

const departments = [
  "HUMAN RESOURCE MANAGEMENT-HRM", "PLANNING RESEARCH AND STATISTICS-PRS",
  "SPECIAL DUTIES-SD", "LEGAL", "AUDIT", "FINANCE & ACCOUNTS-F&A",
  "COMMUNITY DEVELOPMENT SERVICE & SPECIAL PROJECTS-CDS&SP",
  "VENTURES MANAGEMENT-VM", "CORPS WELFARE AND HEALTH SERVICES-CW&HS",
  "GENERAL SERVICES-GS",
  "SKILLS ACQUISITION AND ENTREPRENEURSHIP DEVELOPMENT-SAED",
  "CORPS MOBILIZATION-CM", "CERTIFICATION-CERT", "MEDIA",
  "INFORMATION AND PUBLIC RELATIONS-IPR",
  "INFORMATION AND COMMUNICATION TECHNOLOGY-ICT", "PROCUREMENT-PROC",
  "REFORMS COORDINATION & SERVICE INNOVATIONS",
];

const locations = [
  "AREA OFFICE BAUCHI", "AREA OFFICE DELTA", "AREA OFFICE IMO",
  "AREA OFFICE KADUNA", "AREA OFFICE NASARAWA", "AREA OFFICE NIGER",
  "AREA OFFICE OGUN", "AREA OFFICE OSUN", "AREA OFFICE RIVERS",
  "AREA OFFICE SOKOTO", "AREA OFFICE TARABA", "AREA OFFICE ENUGU",
  "BAKERY AND WATER FACTORY KEFFI", "FEED MILL, IPAJA",
  "GARMENT FACTORY AWKA", "GARMENT FACTORY KEFFI", "GARMENT FACTORY MINNA",
  "NYSC FARM BAUCHI", "NYSC FARM KEBBI", "NYSC FARM OYO",
  "PRINTING PRESS KADUNA", "RICE MILL EBONYI", "SAED CENTRE GOMBE",
  "SAED CENTRE NASARAWA", "SAED CENTRE SHAGAMU",
];

const firstNames = [
  "Chinedu", "Ngozi", "Tunde", "Aisha", "Emeka", "Funke", "Yusuf", "Chiamaka",
  "Ibrahim", "Hauwa", "Obinna", "Blessing", "Femi", "Amaka", "Chukwuma",
  "Zainab", "Suleiman", "Folake", "Adewale", "Grace",
];
const middleNames = [
  "Kelechi", "Ade", "Bala", "Ifeoma", "Garba", "Temitope", "Sani", "Uche",
  "Musa", "Ronke", "Chibuzo", "Aminat", "Damilare", "Ebere", "Tijani",
  "Bisi", "Nasir", "Onyinye", "Lukman", "Patience",
];
const lastNames = [
  "Okafor", "Adeyemi", "Bello", "Eze", "Abubakar", "Nwosu", "Olawale",
  "Okonkwo", "Mohammed", "Adekunle", "Chukwu", "Akpan", "Danjuma", "Obi",
  "Aliyu", "Ogunleye", "Musa", "Ibekwe", "Suleiman", "Yakubu",
];

function readList(payload: unknown): Array<Record<string, unknown>> {
  return readApiList<Record<string, unknown>>(payload);
}

const BATCH_SIZE = 10;

async function runBatched<T>(items: T[], task: (item: T) => Promise<void>) {
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE);
    await Promise.all(batch.map(task));
  }
}

function generateCode(name: string, existingCodes: Set<string>) {
  const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const base =
    words.length > 1
      ? words.map((word) => word[0]).join("").slice(0, 8)
      : (words[0] || "LOC").slice(0, 8);

  if (!existingCodes.has(base)) return base;

  let suffix = 2;
  while (existingCodes.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export default function BulkImportPage() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (line: string) => {
    setLog((current) => [...current, line]);
  };

  const importResource = async (
    path: string,
    field: string,
    values: string[],
  ) => {
    const existingRes = await cachedFetch(path);
    const existingPayload = await existingRes.json().catch(() => null);
    const existing = new Set(
      readList(existingPayload).map((item) =>
        String(item[field]).trim().toLowerCase(),
      ),
    );

    let created = 0;
    let skipped = 0;
    let failed = 0;

    await runBatched(values, async (value) => {
      if (existing.has(value.trim().toLowerCase())) {
        skipped += 1;
        return;
      }

      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        created += 1;
      } else {
        failed += 1;
      }
    });

    appendLog(
      `${path} -> created ${created}, skipped ${skipped} (already existed), failed ${failed}`,
    );
  };

  const importLocations = async (path: string, values: string[]) => {
    const existingRes = await cachedFetch(path);
    const existingPayload = await existingRes.json().catch(() => null);
    const existingList = readList(existingPayload);
    const existingNames = new Set(
      existingList.map((item) => String(item.name).trim().toLowerCase()),
    );
    const existingCodes = new Set(
      existingList.map((item) => String(item.code).toUpperCase()),
    );

    let created = 0;
    let skipped = 0;
    let failed = 0;

    // Codes must be assigned sequentially (each one depends on the codes
    // already claimed), but the actual POST requests don't, so batch those.
    const toCreate: { name: string; code: string }[] = [];

    for (const name of values) {
      if (existingNames.has(name.trim().toLowerCase())) {
        skipped += 1;
        continue;
      }

      const code = generateCode(name, existingCodes);
      existingCodes.add(code);
      toCreate.push({ name, code });
    }

    await runBatched(toCreate, async ({ name, code }) => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
      });

      if (res.ok) {
        created += 1;
      } else {
        failed += 1;
      }
    });

    appendLog(
      `${path} -> created ${created}, skipped ${skipped} (already existed), failed ${failed}`,
    );
  };

  const fetchList = async (path: string) => {
    const res = await cachedFetch(path);
    const payload = await res.json().catch(() => null);
    return readList(payload);
  };

  const createStaff = async (count: number) => {
    const [statesData, departmentsData, gradeLevelsData, ranksData] =
      await Promise.all([
        fetchList("/api/organization/states"),
        fetchList("/api/organization/departments"),
        fetchList("/api/organization/grade-levels"),
        fetchList("/api/organization/ranks"),
      ]);

    if (
      !statesData.length ||
      !departmentsData.length ||
      !gradeLevelsData.length ||
      !ranksData.length
    ) {
      appendLog(
        `Cannot create staff: states=${statesData.length}, departments=${departmentsData.length}, gradeLevels=${gradeLevelsData.length}, ranks=${ranksData.length}`,
      );
      return;
    }

    let created = 0;
    let failed = 0;

    await runBatched(
      Array.from({ length: count }, (_, i) => i),
      async (i) => {
        const sex = i % 2 === 0 ? "male" : "female";
        const fileNumber = `NYSC/STAFF/2026/${String(i + 1).padStart(4, "0")}`;

        const payload = {
          file_number: fileNumber,
          first_name: firstNames[i % firstNames.length],
          middle_name: middleNames[i % middleNames.length],
          last_name: lastNames[i % lastNames.length],
          sex,
          state: (statesData[i % statesData.length] as { id: number }).id,
          department: (departmentsData[i % departmentsData.length] as {
            id: number;
          }).id,
          grade_level: (gradeLevelsData[i % gradeLevelsData.length] as {
            id: number;
          }).id,
          rank: (ranksData[i % ranksData.length] as { id: number }).id,
        };

        const res = await fetch("/api/accounts/staff-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          created += 1;
        } else {
          failed += 1;
          const errorPayload = await res.json().catch(() => null);
          appendLog(
            `Failed "${fileNumber}": ${JSON.stringify(errorPayload)}`,
          );
        }
      },
    );

    appendLog(`Staff creation -> created ${created}, failed ${failed}`);
  };

  const handleFixDepartmentsInLocations = async () => {
    setRunning(true);
    setLog([]);

    appendLog("Checking Locations list for department-like entries...");

    const [statesRes, departmentsRes] = await Promise.all([
      cachedFetch("/api/organization/states", { ttlMs: LONG_TTL_MS }),
      cachedFetch("/api/organization/departments", { ttlMs: LONG_TTL_MS }),
    ]);
    const statesList = readList(await statesRes.json().catch(() => null));
    const departmentsList = readList(
      await departmentsRes.json().catch(() => null),
    );

    const knownDepartmentNames = new Set(
      departments.map((name) => name.trim().toLowerCase()),
    );
    const existingDepartmentNames = new Set(
      departmentsList.map((item) =>
        String(item.name).trim().toLowerCase(),
      ),
    );

    const misplaced = statesList.filter((item) =>
      knownDepartmentNames.has(String(item.name).trim().toLowerCase()),
    );

    if (misplaced.length === 0) {
      appendLog("No department-like entries found in Locations. Nothing to do.");
      setRunning(false);
      return;
    }

    let moved = 0;
    let failed = 0;

    for (const item of misplaced) {
      const name = String(item.name).trim();

      if (!existingDepartmentNames.has(name.toLowerCase())) {
        const createRes = await fetch("/api/organization/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        if (!createRes.ok) {
          failed += 1;
          appendLog(`Failed to create department "${name}", skipping removal.`);
          continue;
        }

        existingDepartmentNames.add(name.toLowerCase());
      }

      const deleteRes = await fetch(`/api/organization/states/${item.id}`, {
        method: "DELETE",
      });

      if (deleteRes.ok || deleteRes.status === 204) {
        moved += 1;
        appendLog(`Moved "${name}" from Locations to Departments.`);
      } else {
        failed += 1;
        appendLog(`Failed to remove "${name}" from Locations.`);
      }
    }

    appendLog(`Done. Moved ${moved}, failed ${failed}.`);
    setRunning(false);
  };

  const handleRun = async () => {
    setRunning(true);
    setLog([]);

    appendLog("Importing ranks...");
    await importResource("/api/organization/ranks", "title", ranks);

    appendLog("Importing departments...");
    await importResource("/api/organization/departments", "name", departments);

    appendLog("Importing locations (stored as states)...");
    await importLocations("/api/organization/states", locations);

    appendLog("Creating 20 placeholder staff...");
    await createStaff(20);

    appendLog("Done.");
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Bulk Import</h2>
        <p className="mt-1 text-sm text-gray-500">
          One-time setup: imports ranks, departments, and locations from the
          organisational structure document, then creates 20 placeholder
          staff using them.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white"
        >
          {running ? "Running..." : "Run Import"}
        </button>

        <button
          type="button"
          onClick={() => void handleFixDepartmentsInLocations()}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-[#1a6b3c]"
        >
          {running ? "Running..." : "Move Departments out of Locations"}
        </button>
      </div>

      {log.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <pre className="whitespace-pre-wrap text-xs text-gray-700">
            {log.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
