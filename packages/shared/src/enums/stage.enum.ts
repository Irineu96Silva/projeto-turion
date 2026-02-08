export const STAGES = ['atendimento', 'cobranca', 'qualificacao'] as const;
export type Stage = (typeof STAGES)[number];
