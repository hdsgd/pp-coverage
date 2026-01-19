// Map form-submission data to Monday payload using provided correlation rules.

export type MappingFormat = 'label' | 'date' | 'number' | 'board_relation' | 'identity';

export interface FieldMappingRule {
  from: string;
  to: string[];
  format?: MappingFormat | MappingFormat[];
}

// Correlation rules between incoming form keys and Monday payload keys.
export const FORM_TO_MONDAY_MAPPINGS: FieldMappingRule[] = [
  { from: 'label__1', to: ['label__1'], format: 'label' },
  { from: 'name', to: ['name'] },
  { from: 'pessoas5__1', to: ['pessoas__1'] },

  // Mapeamentos diretos para campos de texto (substituindo relacionamentos)
  { from: 'lookup_mkrt36cj', to: ['text_mkvhvcw4'] }, // Área Solicitante -> text
  { from: 'lookup_mkrt66aq', to: ['text_mkvhedf5'] }, // Tipo Campanha -> text
  { from: 'lookup_mkrtaebd', to: ['text_mkvhz8g3'] }, // Tipo Cliente -> text
  { from: 'lookup_mkrtcctn', to: ['text_mkvhgbp8'] }, // Canal -> text
  { from: 'lookup_mkrta7z1', to: ['text_mkvhv5ma'] }, // Mecânica -> text
  { from: 'lookup_mkrtvsdj', to: ['text_mkvhwyzr'] }, // Produto -> text
  { from: 'lookup_mkrtxa46', to: ['text_mkvhqgvn'] }, // Tipo Disparo -> text
  { from: 'lookup_mkrtwq7k', to: ['text_mkvh2z7j'] }, // Objetivo -> text
  { from: 'lookup_mkrtxgmt', to: ['text_mkvhammc'] }, // Segmento -> text
  
  // Mapeamento específico para Briefing de Materiais Criativos
  { from: 'lookup_mkrt36cj', to: ['briefing_requesting_area'] }, // Área Solicitante lookup -> validation field
  { from: 'briefing_requesting_area', to: ['text_mkvhvcw4'] }, // Área Solicitante Briefing -> text
  
  // Campos de validação do briefing (nomes reais enviados pelo frontend)
  { from: 'texto_curto_links_validacao', to: ['long_text_mkrd6mnt'] }, // Links úteis para validação
  { from: 'briefing_type', to: ['sele__o_individual9__1'] }, // Tipo de Briefing
  
  // Campos obrigatórios para Growth/BU/Marca
  { from: 'briefing_objective', to: ['sele__o_m_ltipla__1'] }, // Objetivo Principal da Comunicação
  { from: 'briefing_target_audience', to: ['sele__o_m_ltipla1__1'] }, // Ação Esperada
  { from: 'briefing_observations', to: ['texto_curto23__1'] }, // Chamada para ação (CTA)
  
  // Campos de texto do briefing conforme definições (linhas 95-107)
  { from: 'texto_curto6__1', to: ['texto_curto6__1'] }, // Informe o link da régua/jornada de CRM
  { from: 'texto_curto31__1', to: ['texto_curto31__1'] }, // Qual o link da comunicação anterior
  { from: 'texto_curto4__1', to: ['texto_curto4__1'] }, // Disclaimers jurídicos (conforme definições)

  { from: 'n_mero__1', to: ['n_mero__1'], format: 'number' },
  { from: 'data__1', to: ['date_mkr6nj1f'], format: 'date' },
  { from: 'dup__of_c_digo_canal____1', to: ['texto2__1'] },
  { from: 'sele__o_individual9__1', to: ['sele__o_individual9__1'], format: 'label' },
  { from: 'lookup_mkt94f7g', to: ['lookup_mkt94f7g'] }
];

function applyFormat(value: any, format?: MappingFormat): any {
  if (value === undefined || value === null) return value;
  switch (format) {
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    case 'date':
  // Keep as string; downstream service formats date
      return value;
    case 'label':
    case 'board_relation':
    case 'identity':
    default:
      return value;
  }
}

/**
 * Build a Monday-ready data object from the incoming form-submission data.
 * - Preserves original keys (so existing mappings and item_name work)
 * - Adds new keys based on the mapping rules above
 * - Keeps __SUBITEMS__ as-is
 */
export function mapFormSubmissionToMondayData(inputData: Record<string, any>): Record<string, any> {
  // Preserve original data to avoid breaking existing flows
  const output: Record<string, any> = { ...inputData };

  for (const rule of FORM_TO_MONDAY_MAPPINGS) {
    const originalValue = inputData[rule.from];
    if (originalValue === undefined) continue;

    let formats: MappingFormat[] = [];
    if (Array.isArray(rule.format)) {
      formats = rule.format;
    } else if (rule.format) {
      formats = [rule.format];
    }

    rule.to.forEach((targetKey, idx) => {
      const fmt = formats[idx] ?? formats[0];
      output[targetKey] = applyFormat(originalValue, fmt);
    });
  }

  // Keep subitems if present
  if (inputData.__SUBITEMS__) {
    output.__SUBITEMS__ = inputData.__SUBITEMS__;
  }

  // Compute n_mero__1 based on the number of subitems to be sent
  // Prefer the preserved output.__SUBITEMS__, fallback to possible alternative key SUBITEMS
  const subitems = output.__SUBITEMS__ ?? inputData.SUBITEMS ?? inputData.__SUBITEMS__;
  if (Array.isArray(subitems)) {
    output['n_mero__1'] = subitems.length;
  } else if (subitems == null) {
    // If there are no subitems, default to 0
    output['n_mero__1'] = 0;
  }

  // Set date_mkr6nj1f to the earliest date found in subitems' data__1
  if (Array.isArray(subitems) && subitems.length > 0) {
    const dated = subitems
      .map((s: any) => s?.['data__1'])
      .filter((d: any) => typeof d === 'string' && d.trim().length > 0)
      .map((d: string) => ({ str: d, time: Date.parse(d) }))
      .filter((d) => !isNaN(d.time));

    if (dated.length > 0) {
      const min = dated.slice(1).reduce((acc, cur) => (cur.time < acc.time ? cur : acc), dated[0]);
      output['date_mkr6nj1f'] = min.str; // keep original string; downstream handles formatting
    }
  }

  return output;
}
