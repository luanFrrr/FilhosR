import type { SusVaccine, VaccineRecord } from "@shared/schema";

interface VaccineExpectation {
  vaccineId: number;
  vaccineName: string;
  dose: string;
  expectedMonths: number;
}

function parseAgeToMonths(ageRange: string): number[] {
  const months: number[] = [];
  
  if (ageRange.includes("Ao nascer") || ageRange.includes("primeiras 24h")) {
    months.push(0);
  }
  
  const monthMatches = ageRange.match(/(\d+)\s*meses?/gi);
  if (monthMatches) {
    for (const match of monthMatches) {
      const num = parseInt(match.match(/\d+/)?.[0] || "0");
      if (num > 0) months.push(num);
    }
  }
  
  const simpleMonths = ageRange.match(/^(\d+),\s*(\d+),?\s*(\d+)?\s*meses/i);
  if (simpleMonths) {
    for (let i = 1; i <= 3; i++) {
      if (simpleMonths[i]) months.push(parseInt(simpleMonths[i]));
    }
  }
  
  if (ageRange.includes("12 meses") || ageRange.includes("reforço 12m")) {
    if (!months.includes(12)) months.push(12);
  }
  
  if (ageRange.includes("15 meses")) {
    if (!months.includes(15)) months.push(15);
  }
  
  const yearMatches = ageRange.match(/(\d+)\s*anos?/gi);
  if (yearMatches) {
    for (const match of yearMatches) {
      const num = parseInt(match.match(/\d+/)?.[0] || "0");
      if (num > 0 && num <= 6) {
        months.push(num * 12);
      }
    }
  }
  
  return Array.from(new Set(months)).sort((a, b) => a - b);
}

function getDoseForAge(vaccine: SusVaccine, ageMonths: number): string {
  const doses = vaccine.recommendedDoses.split(",").map(d => d.trim());
  const ages = parseAgeToMonths(vaccine.ageRange || "");
  
  // If single dose, return it
  if (doses.length === 1) return doses[0];
  
  // Create sorted copy without mutating original
  const sortedAges = [...ages].sort((a, b) => a - b);
  
  // Find the index of this age in the sorted ages list
  const ageIndex = sortedAges.indexOf(ageMonths);
  
  // If we found a match and it's within bounds, use it
  if (ageIndex >= 0 && ageIndex < doses.length) {
    return doses[ageIndex];
  }
  
  // Fallback: use the position in sorted ages as the dose index
  const position = sortedAges.filter(a => a <= ageMonths).length;
  if (position > 0 && position <= doses.length) {
    return doses[position - 1];
  }
  
  // If position is 0, return first dose
  if (position === 0 && doses.length > 0) {
    return doses[0];
  }
  
  // Return last dose if age exceeds all expected ages
  return doses[doses.length - 1] || doses[0];
}

export function getExpectedVaccinesForAge(
  susVaccines: SusVaccine[],
  childAgeMonths: number
): VaccineExpectation[] {
  const expected: VaccineExpectation[] = [];
  
  for (const vaccine of susVaccines) {
    const ageRange = vaccine.ageRange || "";
    const ages = parseAgeToMonths(ageRange);
    
    for (const expectedAge of ages) {
      if (expectedAge <= childAgeMonths) {
        const dose = getDoseForAge(vaccine, expectedAge);
        expected.push({
          vaccineId: vaccine.id,
          vaccineName: vaccine.name,
          dose,
          expectedMonths: expectedAge,
        });
      }
    }
  }
  
  return expected;
}

export function getPendingVaccines(
  susVaccines: SusVaccine[],
  vaccineRecords: VaccineRecord[],
  childAgeMonths: number
): VaccineExpectation[] {
  const expected = getExpectedVaccinesForAge(susVaccines, childAgeMonths);
  
  // Check each expected dose - dose-aware comparison
  const pending = expected.filter(exp => {
    // Check if there's a record for this vaccine with a matching dose
    const hasMatchingDoseRecord = vaccineRecords.some(rec => {
      if (rec.susVaccineId !== exp.vaccineId) return false;
      // Normalize dose strings for comparison
      const recDose = rec.dose.toLowerCase().trim();
      const expDose = exp.dose.toLowerCase().trim();
      return recDose === expDose || recDose.includes(expDose) || expDose.includes(recDose);
    });
    return !hasMatchingDoseRecord;
  });
  
  return pending;
}

// Get pending doses grouped by vaccine for display
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
