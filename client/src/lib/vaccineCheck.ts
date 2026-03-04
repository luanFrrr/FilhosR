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

  // Casos especiais de nascimento
  if (ageRange.includes("Ao nascer") || ageRange.includes("primeiras 24h")) {
    months.push(0);
  }

  // Captura padrões como "2, 4, 6 meses" ou "12 meses" ou "9 meses"
  const allNumbers = ageRange.match(/\d+/g);
  if (allNumbers) {
    allNumbers.forEach(numStr => {
      const num = parseInt(numStr);
      if (ageRange.toLowerCase().includes(`${num} anos`) || ageRange.toLowerCase().includes(`${num} ano`)) {
        if (num <= 18) months.push(num * 12);
      } else if (ageRange.toLowerCase().includes("mês") || ageRange.toLowerCase().includes("meses") || ageRange.toLowerCase().includes("m")) {
        // Evita pegar números que não se referem a meses se houver ambiguidade
        months.push(num);
      } else if (num > 0 && num <= 15) { 
        // Fallback para números soltos em contexto de idade (comum no PNI)
        months.push(num);
      }
    });
  }

  // Regras específicas para COVID e Influenza que podem ter textos variados
  if (ageRange.includes("COVID") || ageRange.includes("6 meses a 4 anos")) {
    [6, 7, 9].forEach(m => { if (!months.includes(m)) months.push(m); });
  }

  return Array.from(new Set(months)).sort((a, b) => a - b);
}

function getRequiredDosesCount(vaccine: SusVaccine, childAgeMonths: number): number {
  const ages = parseAgeToMonths(vaccine.ageRange || "");
  return ages.filter(age => age <= childAgeMonths).length;
}

export function getExpectedVaccinesForAge(
  susVaccines: SusVaccine[],
  childAgeMonths: number
): VaccineExpectation[] {
  const expected: VaccineExpectation[] = [];
  
  for (const vaccine of susVaccines) {
    const ages = parseAgeToMonths(vaccine.ageRange || "");
    const recommendedDoses = vaccine.recommendedDoses.split(",").map(d => d.trim());
    
    ages.forEach((age, index) => {
      if (age <= childAgeMonths) {
        expected.push({
          vaccineId: vaccine.id,
          vaccineName: vaccine.name,
          dose: recommendedDoses[index] || recommendedDoses[recommendedDoses.length - 1] || "Dose",
          expectedMonths: age,
        });
      }
    });
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
    
    // Lógica simplificada: Se o usuário tem menos registros do que o esperado para a idade,
    // marcamos as doses que faltam.
    if (userRecords.length < expectedDoses.length) {
      // Adiciona as doses excedentes que o usuário ainda não tem
      const missingCount = expectedDoses.length - userRecords.length;
      const missingDoses = expectedDoses.slice(expectedDoses.length - missingCount);
      pending.push(...missingDoses);
    }
  }
  
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
