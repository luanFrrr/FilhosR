export const NEWBORN_SCREENINGS = [
  { key: "heel_prick", label: "Teste do pezinho" },
  { key: "hearing", label: "Teste da orelhinha" },
  { key: "heart", label: "Teste do coracaozinho" },
  { key: "eye", label: "Teste do olhinho" },
  { key: "tongue", label: "Teste da linguinha" },
] as const;

export type NewbornScreeningKey = (typeof NEWBORN_SCREENINGS)[number]["key"];

export const DEVELOPMENT_AGE_BANDS = [
  {
    key: "0_3m",
    label: "0-3 meses",
    targetMonths: 3,
    milestones: [
      { key: "0_3m_eye_contact", title: "Mantem contato visual e reage a vozes" },
      { key: "0_3m_head_control", title: "Inicia sustentacao da cabeca" },
      { key: "0_3m_social_smile", title: "Sorri socialmente" },
    ],
  },
  {
    key: "6m",
    label: "6 meses",
    targetMonths: 6,
    milestones: [
      { key: "6m_rolls", title: "Rola e muda de posicao com apoio" },
      { key: "6m_reaches", title: "Alcanca objetos e leva a boca" },
      { key: "6m_babbles", title: "Balbucia e responde a interacoes" },
    ],
  },
  {
    key: "9m",
    label: "9 meses",
    targetMonths: 9,
    milestones: [
      { key: "9m_sits", title: "Senta com firmeza" },
      { key: "9m_crawls", title: "Se arrasta ou engatinha" },
      { key: "9m_name_response", title: "Responde ao proprio nome" },
    ],
  },
  {
    key: "1y",
    label: "1 ano",
    targetMonths: 12,
    milestones: [
      { key: "1y_stands", title: "Fica em pe ou da passos com apoio" },
      { key: "1y_pincer", title: "Pega pequenos objetos com precisao" },
      { key: "1y_words", title: "Fala palavras simples com intencao" },
    ],
  },
  {
    key: "18m",
    label: "18 meses",
    targetMonths: 18,
    milestones: [
      { key: "18m_walks", title: "Anda com autonomia" },
      { key: "18m_points", title: "Aponta para pedir ou mostrar algo" },
      { key: "18m_simple_commands", title: "Entende comandos simples" },
    ],
  },
  {
    key: "2y",
    label: "2 anos",
    targetMonths: 24,
    milestones: [
      { key: "2y_runs", title: "Corre e sobe pequenos degraus" },
      { key: "2y_two_words", title: "Forma frases curtas" },
      { key: "2y_symbolic_play", title: "Brinca de faz de conta" },
    ],
  },
  {
    key: "3y",
    label: "3 anos",
    targetMonths: 36,
    milestones: [
      { key: "3y_jumps", title: "Pula e coordena melhor os movimentos" },
      { key: "3y_longer_sentences", title: "Fala frases mais completas" },
      { key: "3y_social_interaction", title: "Interage e brinca com outras criancas" },
    ],
  },
] as const;

export type DevelopmentAgeBandKey =
  (typeof DEVELOPMENT_AGE_BANDS)[number]["key"];

export type DevelopmentMilestoneCatalogKey =
  (typeof DEVELOPMENT_AGE_BANDS)[number]["milestones"][number]["key"];

export type DevelopmentStatus = "pending" | "ok" | "attention" | "delayed";

export function addMonthsToDateString(dateString: string, months: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function getAgeInMonthsFromDates(
  birthDate: string,
  referenceDate: string = new Date().toISOString().slice(0, 10),
): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [refYear, refMonth, refDay] = referenceDate.split("-").map(Number);

  let months = (refYear - birthYear) * 12 + (refMonth - birthMonth);
  if (refDay < birthDay) months -= 1;
  return Math.max(months, 0);
}
