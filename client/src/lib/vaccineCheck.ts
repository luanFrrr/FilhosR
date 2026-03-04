import type { SusVaccine, VaccineRecord } from "@shared/schema";

interface VaccineExpectation {
  vaccineId: number;
  vaccineName: string;
  dose: string;
  expectedMonths: number;
}

function parseAgeToMonths(ageRange: string): number[] {
  const months: number[] = [];
  if (!ageRange) return months;

  if (ageRange.includes("Ao nascer") || ageRange.includes("primeiras 24h")) {
    months.push(0);
  }

  const explicit = ageRange.match(/(\d+)\s*meses?/gi);
  if (explicit) {
    for (const m of explicit) {
      const n = parseInt(m.match(/\d+/)![0]);
      if (n > 0) months.push(n);
    }
  }

  const explicitSingle = ageRange.match(/(\d+)\s*mês/gi);
  if (explicitSingle) {
    for (const m of explicitSingle) {
      const n = parseInt(m.match(/\d+/)![0]);
      if (n > 0 && !months.includes(n)) months.push(n);
    }
  }

  const commaMonths = ageRange.match(/(\d+(?:\s*,\s*\d+)+)\s*meses/i);
  if (commaMonths) {
    const nums = commaMonths[1].split(",").map(s => parseInt(s.trim()));
    nums.forEach(n => { if (n > 0 && !months.includes(n)) months.push(n); });
  }

  const yearPatterns = ageRange.match(/(\d+)\s*anos?/gi);
  if (yearPatterns) {
    for (const m of yearPatterns) {
      const n = parseInt(m.match(/\d+/)![0]);
      if (n > 0 && n <= 18) months.push(n * 12);
    }
  }

  const rangeYears = ageRange.match(/(\d+)\s*-\s*(\d+)\s*anos/gi);
  if (rangeYears) {
    for (const m of rangeYears) {
      const nums = m.match(/\d+/g)!;
      const startYear = parseInt(nums[0]);
      if (startYear > 0 && startYear <= 18) {
        if (!months.includes(startYear * 12)) months.push(startYear * 12);
      }
    }
  }

  if (ageRange.includes("reforço 12")) {
    if (!months.includes(12)) months.push(12);
  }

  return Array.from(new Set(months)).sort((a, b) => a - b);
}

function getExpectedDoseCount(vaccine: SusVaccine): number {
  const doses = vaccine.recommendedDoses;
  const parts = doses.split(",").map(d => d.trim()).filter(Boolean);

  if (doses.toLowerCase().includes("dose única") || doses.toLowerCase().includes("dose anual")) {
    return 1;
  }

  const doseNumbers = doses.match(/\d+ª?\s*dose/gi);
  const reforcos = doses.match(/reforço|reforco/gi);
  const count = (doseNumbers?.length || 0) + (reforcos?.length || 0);

  if (count > 0) return count;

  return parts.length || 1;
}

export function getExpectedVaccinesForAge(
  susVaccines: SusVaccine[],
  childAgeMonths: number
): VaccineExpectation[] {
  const expected: VaccineExpectation[] = [];

  for (const vaccine of susVaccines) {
    const ages = parseAgeToMonths(vaccine.ageRange || "");
    const recommendedDoses = vaccine.recommendedDoses.split(",").map(d => d.trim());
    const totalExpected = getExpectedDoseCount(vaccine);

    const dueAges = ages.filter(a => a <= childAgeMonths);

    const dueCount = Math.min(dueAges.length, totalExpected);

    for (let i = 0; i < dueCount; i++) {
      expected.push({
        vaccineId: vaccine.id,
        vaccineName: vaccine.name,
        dose: recommendedDoses[i] || recommendedDoses[recommendedDoses.length - 1] || "Dose",
        expectedMonths: dueAges[i],
      });
    }
  }

  return expected;
}

export function getPendingVaccines(
  susVaccines: SusVaccine[],
  vaccineRecords: VaccineRecord[],
  childAgeMonths: number
): VaccineExpectation[] {
  const pending: VaccineExpectation[] = [];

  for (const vaccine of susVaccines) {
    const expectedDoses = getExpectedVaccinesForAge([vaccine], childAgeMonths);
    const userRecords = vaccineRecords.filter(r => r.susVaccineId === vaccine.id);

    if (userRecords.length < expectedDoses.length) {
      const missingCount = expectedDoses.length - userRecords.length;
      const missingDoses = expectedDoses.slice(expectedDoses.length - missingCount);
      pending.push(...missingDoses);
    }
  }

  return pending;
}

export function getPendingDosesByVaccine(
  susVaccines: SusVaccine[],
  vaccineRecords: VaccineRecord[],
  childAgeMonths: number
): Map<number, VaccineExpectation[]> {
  const pending = getPendingVaccines(susVaccines, vaccineRecords, childAgeMonths);
  const byVaccine = new Map<number, VaccineExpectation[]>();

  for (const exp of pending) {
    const existing = byVaccine.get(exp.vaccineId) || [];
    existing.push(exp);
    byVaccine.set(exp.vaccineId, existing);
  }

  return byVaccine;
}

export function getVaccineStatus(
  susVaccines: SusVaccine[],
  vaccineRecords: VaccineRecord[],
  childAgeMonths: number
): {
  status: "upToDate" | "pending";
  pendingCount: number;
  pendingVaccines: VaccineExpectation[];
} {
  const pending = getPendingVaccines(susVaccines, vaccineRecords, childAgeMonths);

  return {
    status: pending.length === 0 ? "upToDate" : "pending",
    pendingCount: pending.length,
    pendingVaccines: pending,
  };
}
