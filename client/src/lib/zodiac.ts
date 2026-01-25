import { parseISO } from "date-fns";

const zodiacSigns = [
  { name: "Capricórnio", symbol: "♑", start: [12, 22], end: [1, 19] },
  { name: "Aquário", symbol: "♒", start: [1, 20], end: [2, 18] },
  { name: "Peixes", symbol: "♓", start: [2, 19], end: [3, 20] },
  { name: "Áries", symbol: "♈", start: [3, 21], end: [4, 19] },
  { name: "Touro", symbol: "♉", start: [4, 20], end: [5, 20] },
  { name: "Gêmeos", symbol: "♊", start: [5, 21], end: [6, 20] },
  { name: "Câncer", symbol: "♋", start: [6, 21], end: [7, 22] },
  { name: "Leão", symbol: "♌", start: [7, 23], end: [8, 22] },
  { name: "Virgem", symbol: "♍", start: [8, 23], end: [9, 22] },
  { name: "Libra", symbol: "♎", start: [9, 23], end: [10, 22] },
  { name: "Escorpião", symbol: "♏", start: [10, 23], end: [11, 21] },
  { name: "Sagitário", symbol: "♐", start: [11, 22], end: [12, 21] },
];

export function getZodiacSign(birthDate: string | Date): { name: string; symbol: string } | null {
  const date = typeof birthDate === "string" ? parseISO(birthDate) : birthDate;
  if (isNaN(date.getTime())) return null;

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  for (const sign of zodiacSigns) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;

    if (startMonth === 12 && endMonth === 1) {
      if ((month === 12 && day >= startDay) || (month === 1 && day <= endDay)) {
        return { name: sign.name, symbol: sign.symbol };
      }
    } else {
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return { name: sign.name, symbol: sign.symbol };
      }
    }
  }

  return null;
}
