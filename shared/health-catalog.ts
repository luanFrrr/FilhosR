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

export const AGE_BASED_HEALTH_SUGGESTIONS = {
  newborn: {
    title: "Recem-nascido e primeira semana",
    summary:
      "Priorize a triagem neonatal, a consulta da primeira semana e o registro das orientacoes de alta, com foco em aleitamento, ganho de peso e sinais de alerta.",
    focusAreas: [
      "Triagem neonatal e resultados registrados",
      "Consulta da primeira semana de vida",
      "Aleitamento, diurese, evacuacoes e ictericia",
    ],
    suggestedExams: [
      "Registrar comprovantes e resultados da triagem neonatal quando estiverem disponiveis.",
      "Anexar exames ou laudos entregues na maternidade ou solicitados na primeira consulta.",
      "Usar o acompanhamento para guardar orientacoes clinicas da alta e reavaliacoes precoces.",
    ],
  },
  "0_3m": {
    title: "Primeiros meses de vida",
    summary:
      "Nas consultas de puericultura, acompanhe crescimento, alimentacao, sono, interacao e o inicio do controle motor e social.",
    focusAreas: [
      "Puericultura e ganho ponderal",
      "Amamentacao ou alimentacao do lactente",
      "Contato visual, sorriso social e controle cervical",
    ],
    suggestedExams: [
      "Anexar exames solicitados por intercorrencias do periodo neonatal ou do inicio da puericultura.",
      "Registrar reavaliacoes de triagem, bilirrubina, retorno precoce ou outros laudos indicados clinicamente.",
      "Manter observacoes de crescimento e condutas da consulta no mesmo acompanhamento.",
    ],
  },
  "6m": {
    title: "Lactente em torno de 6 meses",
    summary:
      "Esta fase costuma concentrar revisao da alimentacao complementar, crescimento, postura, manipulacao de objetos e resposta social.",
    focusAreas: [
      "Introducao alimentar e rotina de sono",
      "Rolar, sentar com apoio e explorar objetos",
      "Balbucio e interacao com cuidadores",
    ],
    suggestedExams: [
      "Anexar exames solicitados pelo pediatra em consultas de rotina ou por queixas especificas.",
      "Registrar resultados laboratoriais, laudos ou orientacoes nutricionais quando houver indicacao clinica.",
      "Associar o exame ao acompanhamento da consulta que motivou a solicitacao.",
    ],
  },
  "9m": {
    title: "Lactente em torno de 9 meses",
    summary:
      "O foco costuma estar na autonomia motora, na resposta ao nome, na comunicacao inicial e no seguimento do crescimento e da alimentacao.",
    focusAreas: [
      "Sentar com firmeza, arrastar-se ou engatinhar",
      "Resposta ao nome e interacao por gestos e sons",
      "Rotina alimentar, sono e intercorrencias recentes",
    ],
    suggestedExams: [
      "Registrar exames ou laudos relacionados a consultas de seguimento, intercorrencias ou investigacao clinica.",
      "Anexar PDFs, resultados e imagens no acompanhamento correspondente para manter o contexto.",
      "Usar o mesmo registro para resumir a conduta orientada pela equipe de saude.",
    ],
  },
  "1y": {
    title: "Por volta de 1 ano",
    summary:
      "Na revisao de 1 ano, vale observar linguagem inicial, pinca fina, postura em pe, passos com apoio e aspectos da rotina alimentar e clinica.",
    focusAreas: [
      "Ficar em pe, locomocao com apoio e motricidade fina",
      "Primeiras palavras e compreensao de ordens simples",
      "Puericultura, alimentacao e seguimento clinico",
    ],
    suggestedExams: [
      "Anexar exames solicitados na revisao de 1 ano ou em consultas com especialistas.",
      "Guardar resultados laboratoriais, laudos de imagem ou pareceres no acompanhamento da visita correspondente.",
      "Registrar no texto do acompanhamento a principal hipotese, conduta e retorno orientado.",
    ],
  },
  "18m": {
    title: "Por volta de 18 meses",
    summary:
      "Nesta etapa, o acompanhamento costuma valorizar autonomia para andar, comunicacao, brincadeira funcional e resposta a comandos simples.",
    focusAreas: [
      "Marcha com autonomia e exploracao do ambiente",
      "Apontar, pedir, compreender e obedecer comandos simples",
      "Linguagem, comportamento e rotina da crianca",
    ],
    suggestedExams: [
      "Registrar exames solicitados para seguimento clinico, linguagem, audicao ou desenvolvimento, quando houver.",
      "Centralizar laudos, pareceres e orientacoes vinculados a consultas dessa fase.",
      "Manter o contexto do exame associado a queixa, avaliacao e plano de cuidado.",
    ],
  },
  "2y": {
    title: "Por volta de 2 anos",
    summary:
      "A observacao clinica costuma incluir linguagem em frases curtas, brincadeira simbolica, interacao social, sono, alimentacao e comportamento.",
    focusAreas: [
      "Correr, subir degraus e coordenacao global",
      "Juncao de palavras, comunicacao e faz de conta",
      "Alimentacao, sono, desfralde e comportamento",
    ],
    suggestedExams: [
      "Anexar exames solicitados em consultas de rotina ou diante de queixas especificas.",
      "Organizar laudos e resultados no acompanhamento que melhor explica o contexto clinico.",
      "Registrar se o pedido surgiu por puericultura, intercorrencia ou encaminhamento.",
    ],
  },
  "3y": {
    title: "Por volta de 3 anos",
    summary:
      "O acompanhamento pode destacar linguagem mais elaborada, brincadeira com outras criancas, coordenacao motora e desenvolvimento global.",
    focusAreas: [
      "Frases mais completas e compreensao da fala",
      "Brincadeira compartilhada e interacao social",
      "Saltos, equilibrio e coordenacao motora",
    ],
    suggestedExams: [
      "Registrar exames e laudos solicitados nesta etapa, especialmente quando houver seguimento ou encaminhamento.",
      "Anexar resultados de consultas, intercorrencias, avaliacoes complementares e retornos especializados.",
      "Usar o acompanhamento como historico clinico resumido da fase.",
    ],
  },
} as const;

export function getClosestDevelopmentAgeBand(months: number) {
  return DEVELOPMENT_AGE_BANDS.reduce((closest, current) => {
    const currentDistance = Math.abs(current.targetMonths - months);
    const closestDistance = Math.abs(closest.targetMonths - months);

    if (currentDistance < closestDistance) return current;
    if (currentDistance === closestDistance && current.targetMonths > closest.targetMonths) {
      return current;
    }

    return closest;
  }, DEVELOPMENT_AGE_BANDS[0]);
}

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
