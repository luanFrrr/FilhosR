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

function getDoseForAge(vaccine: SusVaccine, ageMonths: number): string | null {
  const doses = vaccine.recommendedDoses.split(",").map(d => d.trim());
  const ages = parseAgeToMonths(vaccine.ageRange || "");
  
  const ageIndex = ages.indexOf(ageMonths);
  if (ageIndex >= 0 && ageIndex < doses.length) {
    return doses[ageIndex] || doses[0];
  }
  
  if (doses.length === 1) return doses[0];
  
  return doses[ages.findIndex(a => a === ageMonths)] || null;
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
        if (dose) {
          expected.push({
            vaccineId: vaccine.id,
            vaccineName: vaccine.name,
            dose,
            expectedMonths: expectedAge,
          });
        }
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
  
  const pending = expected.filter(exp => {
    const hasRecord = vaccineRecords.some(
      rec => rec.susVaccineId === exp.vaccineId
    );
    return !hasRecord;
  });
  
  return pending;
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
