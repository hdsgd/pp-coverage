// Interface para mapear campos do formulário para campos da Monday.com
export interface MondayFormMapping {
  // Campos básicos do item
  board_id: string;
  group_id: string;
  item_name_field?: string; // campo do formulário que será usado como nome do item
  default_item_name?: string; // nome padrão se não houver campo específico
  
  // Mapeamento de campos do formulário para colunas da Monday
  column_mappings: ColumnMapping[];
}

export interface ColumnMapping {
  // ID da coluna na Monday.com
  monday_column_id: string;
  
  // Campo correspondente no formulário (usando dot notation para objetos aninhados)
  form_field_path: string;
  
  // Tipo da coluna na Monday (para formatação adequada)
  column_type: MondayColumnType;
  
  // Valor padrão se o campo não existir no formulário
  default_value?: any;
  
  // Transformação personalizada (opcional)
  // Recebe o valor do campo e o formData completo para transformações que precisam de múltiplos campos
  transform?: (value: any, formData?: FormSubmissionData) => any;
}

export enum MondayColumnType {
  TEXT = 'text',
  DATE = 'date',
  NUMBER = 'number',
  STATUS = 'status',
  CHECKBOX = 'checkbox',
  DROPDOWN = 'dropdown',
  PEOPLE = 'people',
  EMAIL = 'email',
  PHONE = 'phone',
  LINK = 'link',
  RATING = 'rating',
  TIMELINE = 'timeline',
  TAGS = 'tags',
  FILE = 'file',
  BOARD_RELATION = 'board_relation'
}

// Interface para dados do formulário recebidos
export interface FormSubmissionData {
  id: string;
  timestamp: string;
  formTitle: string;
  data: {
    [key: string]: any;
    __SUBITEMS__?: SubitemData[];
  };
}

export interface SubitemData {
  id?: string; // ID do subitem
  conectar_quadros87__1?: string; // Canal (Email, Push, etc.)
  data__1?: string; // Data do disparo (formato YYYY-MM-DD)
  n_meros__1?: number; // Número/ordem do disparo
  texto__1?: string; // Texto/descrição do disparo
  lista_suspensa5__1?: string[]; // Tipo de benefício (Emocional, etc.)
  lista_suspensa53__1?: string[]; // Gatilhos (Exclusividade, etc.)
  conectar_quadros_mkkcnyr3?: string; // Hora do disparo (formato HH:MM)
  n_meros_mkkchcmk?: number; // Volume/quantidade do disparo
  [key: string]: any; // Para campos dinâmicos adicionais
}

// Configuração específica para o formulário de campanha
export const CAMPAIGN_FORM_MAPPING: MondayFormMapping = {
  board_id: "7410140027",
  group_id: "topics",
  item_name_field: "data.name",
  default_item_name: "Nova Campanha",
  column_mappings: [
    {
      monday_column_id: "pessoas__1", // Pessoas - responsável (ajustado conforme novo mapeamento)
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    {
      monday_column_id: "label__1", // Tipo de solicitação
      form_field_path: "data.label__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrt36cj", // Lookup 1 - Categoria
      form_field_path: "data.lookup_mkrt36cj",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrt66aq", // Lookup 2 - Tipo
      form_field_path: "data.lookup_mkrt66aq",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtaebd", // Lookup 3 - Segmento
      form_field_path: "data.lookup_mkrtaebd",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtcctn", // Lookup 4 - Canal
      form_field_path: "data.lookup_mkrtcctn",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrta7z1", // Lookup 5 - Benefício
      form_field_path: "data.lookup_mkrta7z1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtvsdj", // Lookup 6 - Jornada
      form_field_path: "data.lookup_mkrtvsdj",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtxa46", // Lookup 7 - Evento
      form_field_path: "data.lookup_mkrtxa46",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtwq7k", // Lookup 8 - Objetivo
      form_field_path: "data.lookup_mkrtwq7k",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtxgmt", // Lookup 9 - Perfil
      form_field_path: "data.lookup_mkrtxgmt",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "n_mero__1", // Número - Volume estimado
      form_field_path: "data.n_mero__1",
      column_type: MondayColumnType.NUMBER
    },
  // Datas serão enviadas pelos campos date_mkr6nj1f e date_mkrj355f via transformação externa
  // Código do canal será enviado no campo texto2__1 via transformação externa
  ]
};

// Configuração específica para o formulário "Disparo CRM com Briefing de Materiais Criativos"
export const DISPARO_CRM_BRIEFING_FORM_MAPPING: MondayFormMapping = {
  board_id: "7410140027",
  group_id: "topics", 
  item_name_field: "data.name",
  default_item_name: "Disparo CRM com Briefing",
  column_mappings: [
    {
      monday_column_id: "pessoas__1", // Pessoas - responsável 
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    {
      monday_column_id: "label__1", // Tipo de solicitação
      form_field_path: "data.label__1", 
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "sele__o_individual9__1", // Tipo de Briefing - campo específico deste formulário
      form_field_path: "data.sele__o_individual9__1",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "lookup_mkrt36cj", // Lookup 1 - Categoria
      form_field_path: "data.lookup_mkrt36cj",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrt66aq", // Lookup 2 - Tipo
      form_field_path: "data.lookup_mkrt66aq",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtaebd", // Lookup 3 - Segmento
      form_field_path: "data.lookup_mkrtaebd",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtcctn", // Lookup 4 - Canal
      form_field_path: "data.lookup_mkrtcctn",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrta7z1", // Lookup 5 - Benefício
      form_field_path: "data.lookup_mkrta7z1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtvsdj", // Lookup 6 - Jornada
      form_field_path: "data.lookup_mkrtvsdj",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtxa46", // Lookup 7 - Evento
      form_field_path: "data.lookup_mkrtxa46",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtwq7k", // Lookup 8 - Objetivo
      form_field_path: "data.lookup_mkrtwq7k",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtxgmt", // Lookup 9 - Perfil
      form_field_path: "data.lookup_mkrtxgmt",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "n_mero__1", // Número - Volume estimado
      form_field_path: "data.n_mero__1",
      column_type: MondayColumnType.NUMBER
    }
    // Datas serão enviadas pelos campos date_mkr6nj1f e date_mkrj355f via transformação externa
    // NOTA: Este formulário NÃO inclui texto2__1 (Id Briefing), diferente do CAMPAIGN_FORM_MAPPING
  ]
};

// Configuração específica para o formulário de campanha GAM
export const GAM_CAMPAIGN_FORM_MAPPING: MondayFormMapping = {
  board_id: "7410140027", // Board principal GAM
  group_id: "topics", // Grupo padrão
  item_name_field: "data.name", // Nome da campanha
  default_item_name: "Nova Campanha GAM",
  column_mappings: [
    {
      monday_column_id: "pessoas__1", // Demandante (pessoas responsáveis) - campo correto
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    {
      monday_column_id: "label__1", // Tipo de solicitação (Nova Campanha GAM, etc.)
      form_field_path: "data.label__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "timerange_mkrmvz3", // Cronograma da Campanha (timeline com start e end)
      form_field_path: "data.gam_timeline",
      column_type: MondayColumnType.TIMELINE,
      transform: (value: any, formData?: FormSubmissionData) => {
        // Se gam_timeline existe, usar ele
        if (value && typeof value === 'object' && value.from && value.to) {
          return value;
        }
        // Caso contrário, construir a partir de gam_start_date e gam_end_date
        const startDate = formData?.data?.gam_start_date;
        const endDate = formData?.data?.gam_end_date;
        if (startDate && endDate) {
          return { from: startDate, to: endDate };
        }
        return undefined;
      }
    },
    {
      monday_column_id: "text_mkvhz8g3", // Tipo de cliente (texto direto)
      form_field_path: "data.gam_client_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhedf5", // Tipo da campanha (texto direto)
      form_field_path: "data.gam_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhv5ma", // Mecânica da campanha (texto direto)
      form_field_path: "data.gam_mechanism",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhvcw4", // Área solicitante (texto direto)
      form_field_path: "data.gam_requesting_area",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhammc", // Segmento de público (texto direto)
      form_field_path: "data.gam_target_segment",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhwyzr", // Produto ou serviço (texto direto)
      form_field_path: "data.gam_product_service",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvh2z7j", // Objetivo da campanha (texto direto)
      form_field_path: "data.gam_objective",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhgbp8", // Canal (texto direto)
      form_field_path: "data.gam_channels",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "dropdown_mks9mwp1", // Canais GAM (dropdown específico)
      form_field_path: "data.gam_channels",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "color_mkrm8t9t", // Tipo de Formato (status correto)
      form_field_path: "data.gam_format_type",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "dropdown_mkrmt77x", // Campanha GAM (dropdown correto)
      form_field_path: "data.gam_campaign_type_specific",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "text_mkrmjbhf", // Campanha GAM Outro (texto)
      form_field_path: "data.gam_other_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mktssxcq", // Link Direcionamento Banners (correto)
      form_field_path: "data.gam_banner_links",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "color_mkrn99jy", // Formato Audiência (status correto)
      form_field_path: "data.gam_audience_format",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "long_text_mkrnxnq7", // Observações (long text correto)
      form_field_path: "data.gam_observations",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "n_mero__1", // Volume estimado (adicionado)
      form_field_path: "data.n_mero__1",
      column_type: MondayColumnType.NUMBER,
      default_value: 0
    }
  ]
};

// Configuração específica para o formulário de briefing de materiais criativos + GAM
export const BRIEFING_MATERIAIS_CRIATIVOS_GAM_FORM_MAPPING: MondayFormMapping = {
  board_id: "7410140027", // Board principal (mesmo do CRM)
  group_id: "topics", // Grupo padrão
  item_name_field: "data.name", // Nome da campanha
  default_item_name: "Briefing + GAM",
  column_mappings: [
    {
      monday_column_id: "pessoas__1", // Demandante (pessoas responsáveis)
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    {
      monday_column_id: "label__1", // Tipo de solicitação
      form_field_path: "data.label__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "sele__o_individual9__1", // Tipo de Briefing
      form_field_path: "data.sele__o_individual9__1",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "date_mkr6nj1f", // Data de início da campanha
      form_field_path: "data.gam_start_date",
      column_type: MondayColumnType.DATE,
      default_value: new Date().toISOString().split('T')[0] // Data atual como fallback
    },
    {
      monday_column_id: "date_mkrj355f", // Data de fim da campanha  
      form_field_path: "data.gam_end_date",
      column_type: MondayColumnType.DATE,
      default_value: new Date().toISOString().split('T')[0] // Data atual como fallback
    },
    // Campos GAM usando os campos corretos do board
    {
      monday_column_id: "text_mkvhz8g3", // Tipo de cliente (texto direto)
      form_field_path: "data.gam_client_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhedf5", // Tipo da campanha (texto direto)
      form_field_path: "data.gam_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhv5ma", // Mecânica da campanha (texto direto)
      form_field_path: "data.gam_mechanism",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhvcw4", // Área solicitante (texto direto)
      form_field_path: "data.gam_requesting_area",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhammc", // Segmento de público (texto direto)
      form_field_path: "data.gam_target_segment",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhwyzr", // Produto ou serviço (texto direto)
      form_field_path: "data.gam_product_service",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvh2z7j", // Objetivo da campanha (texto direto)
      form_field_path: "data.gam_objective",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhgbp8", // Canal (texto direto)
      form_field_path: "data.gam_channels",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "dropdown_mks9mwp1", // Canais GAM (dropdown específico)
      form_field_path: "data.gam_channels",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "color_mkrm8t9t", // Tipo de Formato (status correto)
      form_field_path: "data.gam_format_type",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "dropdown_mkrmt77x", // Campanha GAM (dropdown correto)
      form_field_path: "data.gam_campaign_type_specific",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "text_mkrmjbhf", // Campanha GAM Outro (texto)
      form_field_path: "data.gam_other_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mktssxcq", // Link Direcionamento Banners (correto)
      form_field_path: "data.gam_banner_links",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "color_mkrn99jy", // Formato Audiência (status correto)
      form_field_path: "data.gam_audience_format",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "long_text_mkrnxnq7", // Observações (long text correto)
      form_field_path: "data.gam_observations",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "n_mero__1", // Volume estimado
      form_field_path: "data.n_mero__1",
      column_type: MondayColumnType.NUMBER,
      default_value: 0
    }
  ]
};

// Configuração específica para o formulário completo: Briefing + Disparo CRM + GAM
export const DISPARO_CRM_BRIEFING_MATERIAIS_CRIATIVOS_GAM_FORM_MAPPING: MondayFormMapping = {
  board_id: "7410140027", // Board principal (mesmo do CRM)
  group_id: "topics", // Grupo padrão
  item_name_field: "data.name", // Nome da campanha
  default_item_name: "Briefing + Disparo CRM + GAM",
  column_mappings: [
    {
      monday_column_id: "pessoas__1", // Demandante (pessoas responsáveis)
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    {
      monday_column_id: "label__1", // Tipo de solicitação
      form_field_path: "data.label__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "sele__o_individual9__1", // Tipo de Briefing
      form_field_path: "data.sele__o_individual9__1",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "date_mkr6nj1f", // Data de início da campanha
      form_field_path: "data.gam_start_date",
      column_type: MondayColumnType.DATE,
      default_value: new Date().toISOString().split('T')[0]
    },
    {
      monday_column_id: "date_mkrj355f", // Data de fim da campanha  
      form_field_path: "data.gam_end_date",
      column_type: MondayColumnType.DATE,
      default_value: new Date().toISOString().split('T')[0]
    },
    // Campos GAM usando os campos corretos do board
    {
      monday_column_id: "text_mkvhz8g3", // Tipo de cliente (texto direto)
      form_field_path: "data.gam_client_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhedf5", // Tipo da campanha (texto direto)
      form_field_path: "data.gam_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhqgvn", // Tipo Disparo (CRM + GAM tem disparos)
      form_field_path: "data.gam_dispatch_type",
      column_type: MondayColumnType.TEXT,
      default_value: "CRM+GAM"
    },
    {
      monday_column_id: "text_mkvhv5ma", // Mecânica da campanha (texto direto)
      form_field_path: "data.gam_mechanism",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhvcw4", // Área solicitante (texto direto)
      form_field_path: "data.gam_requesting_area",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhammc", // Segmento de público (texto direto)
      form_field_path: "data.gam_target_segment",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhwyzr", // Produto ou serviço (texto direto)
      form_field_path: "data.gam_product_service",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvh2z7j", // Objetivo da campanha (texto direto)
      form_field_path: "data.gam_objective",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkvhgbp8", // Canal (texto direto)
      form_field_path: "data.gam_channels",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "dropdown_mks9mwp1", // Canais GAM (dropdown específico)
      form_field_path: "data.gam_channels",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "color_mkrm8t9t", // Tipo de Formato (status correto)
      form_field_path: "data.gam_format_type",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "dropdown_mkrmt77x", // Campanha GAM (dropdown correto)
      form_field_path: "data.gam_campaign_type_specific",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "text_mkrmjbhf", // Campanha GAM Outro (texto)
      form_field_path: "data.gam_other_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mktssxcq", // Link Direcionamento Banners (correto)
      form_field_path: "data.gam_banner_links",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "color_mkrn99jy", // Formato Audiência (status correto)
      form_field_path: "data.gam_audience_format",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "long_text_mkrnxnq7", // Observações (long text correto)
      form_field_path: "data.gam_observations",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto2__1", // Briefing ID (específico para CRM + Briefing)
      form_field_path: "data.briefing_id",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "n_mero__1", // Volume estimado
      form_field_path: "data.n_mero__1",
      column_type: MondayColumnType.NUMBER,
      default_value: 0
    }
  ]
};

// Configuração específica para o Board Fluxo de MKT (4659200788)
export const MARKETING_BOARD_FORM_MAPPING: MondayFormMapping = {
  board_id: "4659200788", // Board Fluxo de MKT
  group_id: "topics",
  item_name_field: "data.name",
  default_item_name: "Briefing MKT",
  column_mappings: [
    // Arquivos e referências
    {
      monday_column_id: "arquivos",
      form_field_path: "data.enviar_arquivo__1",
      column_type: MondayColumnType.FILE
    },
    // Área Demandante - mapeamento para Status
    {
      monday_column_id: "status_1",
      form_field_path: "data.text_mkvhvcw4",
      column_type: MondayColumnType.STATUS
    },
    // Tipo de Briefing
    {
      monday_column_id: "status_15",
      form_field_path: "data.sele__o_individual9__1",
      column_type: MondayColumnType.STATUS
    },
    // Demandante (Pessoas)
    {
      monday_column_id: "pessoas7",
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    // Links úteis para validação
    {
      monday_column_id: "long_text_mkrdqn35",
      form_field_path: "data.long_text_mkrd6mnt",
      column_type: MondayColumnType.TEXT
    },
    
    // ===== CONEXÃO COM BOARD PRINCIPAL (seguindo padrão do CRM) =====
    {
      monday_column_id: "board_relation_mkmhpe1e", // link to Campanhas & Briefings
      form_field_path: "data.main_board_item_id",
      column_type: MondayColumnType.BOARD_RELATION
    },
    // Contexto da Comunicação
    {
      monday_column_id: "texto_longo17",
      form_field_path: "data.long_text_mksehp7a",
      column_type: MondayColumnType.TEXT
    },
    // Nome da Campanha
    {
      monday_column_id: "texto_curto8",
      form_field_path: "data.name",
      column_type: MondayColumnType.TEXT
    },
    // Target/Público Alvo
    {
      monday_column_id: "texto_longo2",
      form_field_path: "data.texto_longo2",
      column_type: MondayColumnType.TEXT
    },
    // Link comunicação anterior
    {
      monday_column_id: "texto_longo93",
      form_field_path: "data.texto_curto31__1",
      column_type: MondayColumnType.TEXT
    },
    // Produto
    {
      monday_column_id: "sele__o_m_ltipla8",
      form_field_path: "data.text_mkvhwyzr",
      column_type: MondayColumnType.DROPDOWN
    },
    // Objetivo Principal
    {
      monday_column_id: "texto_curto6",
      form_field_path: "data.sele__o_m_ltipla__1",
      column_type: MondayColumnType.TEXT
    },
    // Mecânica
    {
      monday_column_id: "texto_longo8",
      form_field_path: "data.text_mkvhv5ma",
      column_type: MondayColumnType.TEXT
    },
    // Obrigatoriedades
    {
      monday_column_id: "texto_curto65",
      form_field_path: "data.texto_curto8__1",
      column_type: MondayColumnType.TEXT
    },
    // CTA
    {
      monday_column_id: "texto_longo455",
      form_field_path: "data.texto_curto23__1",
      column_type: MondayColumnType.TEXT
    },
    // Ação esperada
    {
      monday_column_id: "sele__o_m_ltipla17",
      form_field_path: "data.sele__o_m_ltipla1__1",
      column_type: MondayColumnType.DROPDOWN
    },
    // Hero
    {
      monday_column_id: "texto_curto7",
      form_field_path: "data.text_mksn5est",
      column_type: MondayColumnType.TEXT
    },
    // Tensão/Oportunidade de Conteúdo
    {
      monday_column_id: "texto_curto2",
      form_field_path: "data.text_mksns2p1",
      column_type: MondayColumnType.TEXT
    },
    // Posicionamento e Mensagem Principal
    {
      monday_column_id: "texto_longo9",
      form_field_path: "data.long_text_mksn15gd",
      column_type: MondayColumnType.TEXT
    },
    // Disclaimer jurídico
    {
      monday_column_id: "texto_curto24",
      form_field_path: "data.texto_curto4__1",
      column_type: MondayColumnType.TEXT
    },
    // Links úteis e referências
    {
      monday_column_id: "texto_longo1",
      form_field_path: "data.texto_curto6__1",
      column_type: MondayColumnType.TEXT
    },
    // Tipo de entregáveis
    {
      monday_column_id: "sele__o_m_ltipla2",
      form_field_path: "data.sele__o_m_ltipla18__1",
      column_type: MondayColumnType.DROPDOWN
    },
    // Data de entrega
    {
      monday_column_id: "data64",
      form_field_path: "data.data__1",
      column_type: MondayColumnType.DATE
    },
    // Previsão de lançamento
    {
      monday_column_id: "data76",
      form_field_path: "data.data76",
      column_type: MondayColumnType.DATE
    },
    // Campos numéricos de peças
    { monday_column_id: "n_mero_mkm0eb96", form_field_path: "data.n_meros_mkn59dj1", column_type: MondayColumnType.NUMBER }, // RCS
    { monday_column_id: "n_mero13__1", form_field_path: "data.n_meros_mkn5pst6", column_type: MondayColumnType.NUMBER }, // Banner Pix
    { monday_column_id: "n_mero44__1", form_field_path: "data.n_meros_mkn5hh88", column_type: MondayColumnType.NUMBER }, // Banner DM
    { monday_column_id: "n_mero6__1", form_field_path: "data.n_meros_mkn5ykp4", column_type: MondayColumnType.NUMBER }, // In-App Full Screen
    { monday_column_id: "n_mero1__1", form_field_path: "data.n_meros_mkn5w9c", column_type: MondayColumnType.NUMBER }, // Banner notificação
    { monday_column_id: "n_mero4__1", form_field_path: "data.n_meros__1", column_type: MondayColumnType.NUMBER }, // Lojas de App
    { monday_column_id: "n_mero06", form_field_path: "data.n_meros3__1", column_type: MondayColumnType.NUMBER }, // Header de WhatsApp
    { monday_column_id: "n_mero15", form_field_path: "data.n_meros8__1", column_type: MondayColumnType.NUMBER }, // Anúncio|Revista|Impresso
    { monday_column_id: "numeric_mkqqbkx2", form_field_path: "data.numeric_mkqqwthm", column_type: MondayColumnType.NUMBER }, // WhatsApp Carrossel
    { monday_column_id: "n_mero587", form_field_path: "data.n_meros6__1", column_type: MondayColumnType.NUMBER }, // Mídia Kit
    { monday_column_id: "n_mero14", form_field_path: "data.n_meros81__1", column_type: MondayColumnType.NUMBER }, // YouTube | Vídeo
    { monday_column_id: "n_mero9", form_field_path: "data.n_meros0__1", column_type: MondayColumnType.NUMBER }, // Twitter | Vídeo Feed
    { monday_column_id: "n_mero24", form_field_path: "data.n_meros62__1", column_type: MondayColumnType.NUMBER }, // Twitter | Feed Estático
    { monday_column_id: "n_mero00", form_field_path: "data.n_meros38__1", column_type: MondayColumnType.NUMBER }, // Twitter | Copy
    { monday_column_id: "n_mero38", form_field_path: "data.n_meros80__1", column_type: MondayColumnType.NUMBER }, // Instagram | Video Reels
    { monday_column_id: "n_mero07", form_field_path: "data.n_meros2__1", column_type: MondayColumnType.NUMBER }, // Instagram | Thumb
    { monday_column_id: "n_mero850", form_field_path: "data.n_meros66__1", column_type: MondayColumnType.NUMBER }, // Instagram | Story
    { monday_column_id: "n_mero27", form_field_path: "data.n_meros800__1", column_type: MondayColumnType.NUMBER }, // Instagram | Feed Estático
    { monday_column_id: "n_mero83", form_field_path: "data.n_meros28__1", column_type: MondayColumnType.NUMBER }, // Instagram | Feed Carrossel
    { monday_column_id: "n_mero527", form_field_path: "data.n_meros34__1", column_type: MondayColumnType.NUMBER }, // Instagram | Copy
    { monday_column_id: "n_mero28", form_field_path: "data.n_meros03__1", column_type: MondayColumnType.NUMBER }, // Facebook | Vídeo Feed
    { monday_column_id: "n_mero84", form_field_path: "data.n_meros07__1", column_type: MondayColumnType.NUMBER }, // Facebook | Feed Estático
    { monday_column_id: "n_mero71", form_field_path: "data.n_meros64__1", column_type: MondayColumnType.NUMBER }, // Facebook | Feed Carrossel
    { monday_column_id: "n_mero85", form_field_path: "data.n_meros37__1", column_type: MondayColumnType.NUMBER }, // Webview
    { monday_column_id: "text_mkrtxtvw", form_field_path: "data.text_mkrtbysb", column_type: MondayColumnType.TEXT }, // Deep Link
    { monday_column_id: "n_mero73", form_field_path: "data.n_meros077__1", column_type: MondayColumnType.NUMBER }, // Banner | Home
    { monday_column_id: "banner___store", form_field_path: "data.n_meros5__1", column_type: MondayColumnType.NUMBER }, // Banner | Store
    { monday_column_id: "slide_up", form_field_path: "data.n_meros32__1", column_type: MondayColumnType.NUMBER }, // Slide-up
    { monday_column_id: "n_mero05", form_field_path: "data.n_meros02__1", column_type: MondayColumnType.NUMBER }, // Validação de entrega para parceiro
    { monday_column_id: "n_mero16", form_field_path: "data.n_meros4__1", column_type: MondayColumnType.NUMBER }, // Vídeo
    { monday_column_id: "n_mero8", form_field_path: "data.n_meros44__1", column_type: MondayColumnType.NUMBER }, // Subjects
    { monday_column_id: "n_mero50", form_field_path: "data.n_meros43__1", column_type: MondayColumnType.NUMBER }, // SMS
    { monday_column_id: "n_mero52", form_field_path: "data.n_meros21__1", column_type: MondayColumnType.NUMBER }, // Roteiro
    { monday_column_id: "n_mero2", form_field_path: "data.n_meros9__1", column_type: MondayColumnType.NUMBER }, // Push
    { monday_column_id: "n_mero40", form_field_path: "data.n_meros92__1", column_type: MondayColumnType.NUMBER }, // Post Estático
    { monday_column_id: "n_mero6", form_field_path: "data.n_meros7__1", column_type: MondayColumnType.NUMBER }, // Post Animado
    { monday_column_id: "n_mero5", form_field_path: "data.n_meros94__1", column_type: MondayColumnType.NUMBER }, // Lâminas de WhatsApp
    { monday_column_id: "n_mero0", form_field_path: "data.n_meros60__1", column_type: MondayColumnType.NUMBER }, // KV
    { monday_column_id: "n_mero39", form_field_path: "data.n_meros447__1", column_type: MondayColumnType.NUMBER }, // DM
    { monday_column_id: "n_mero1", form_field_path: "data.n_meros47__1", column_type: MondayColumnType.NUMBER }, // In-App
    { monday_column_id: "n_mero7", form_field_path: "data.n_meros942__1", column_type: MondayColumnType.NUMBER }, // Enxoval Social
    { monday_column_id: "n_mero3", form_field_path: "data.n_meros1__1", column_type: MondayColumnType.NUMBER }, // E-Mail MKT
    { monday_column_id: "n_mero4", form_field_path: "data.n_meros430__1", column_type: MondayColumnType.NUMBER }, // Display
    { monday_column_id: "texto_curto85", form_field_path: "data.texto_curto85", column_type: MondayColumnType.TEXT }, // Informe tipo outros
    { monday_column_id: "n_mero__1", form_field_path: "data.n_meros41__1", column_type: MondayColumnType.NUMBER } // Quantidade Outros
  ]
};

// Configuração específica para o formulário de briefing de materiais criativos (legacy)
export const BRIEFING_MATERIAIS_CRIATIVOS_FORM_MAPPING: MondayFormMapping = {
  board_id: "7410140027", // Usando o mesmo board por enquanto - ajustar conforme necessário
  group_id: "topics", // Grupo padrão
  item_name_field: "data.name", // Nome da campanha
  default_item_name: "Briefing de Materiais Criativos",
  column_mappings: [
    {
      monday_column_id: "pessoas__1", // Demandante (pessoas responsáveis)
      form_field_path: "data.pessoas5__1",
      column_type: MondayColumnType.PEOPLE
    },
    {
      monday_column_id: "label__1", // Tipo de solicitação (Briefing de Materiais Criativos)
      form_field_path: "data.label__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrt36cj", // Área solicitante
      form_field_path: "data.briefing_requesting_area",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "sele__o_individual9__1", // Tipo de briefing
      form_field_path: "data.briefing_type",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "texto2__1", // Descrição do briefing
      form_field_path: "data.briefing_description",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto3__1", // Objetivo do material
      form_field_path: "data.briefing_objective",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto4__1", // Público-alvo
      form_field_path: "data.briefing_target_audience",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto5__1", // Observações
      form_field_path: "data.briefing_observations",
      column_type: MondayColumnType.TEXT
    },
    // Campos condicionais para GAM
    {
      monday_column_id: "lista_suspensa__1", // Tipo de campanha GAM (múltiplos itens)
      form_field_path: "data.gam_campaign_type_specific",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "texto6__1", // Outro tipo de campanha GAM (obrigatório se "Outro" selecionado)
      form_field_path: "data.gam_other_campaign_type",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lista_suspensa2__1", // Formato para receber audiência
      form_field_path: "data.gam_audience_format",
      column_type: MondayColumnType.DROPDOWN
    },
    // Campos condicionais para Houston (Validation)
    {
      monday_column_id: "texto7__1", // Nome da validation para criar audiência
      form_field_path: "data.gam_houston_validation_name",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "lookup_mkrtcctn", // Canais GAM (para Houston Validation)
      form_field_path: "data.gam_houston_channels",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto8__1", // Observações (para Houston Validation)
      form_field_path: "data.gam_houston_observations",
      column_type: MondayColumnType.TEXT
    },
    // Campos condicionais para Houston (Query)
    {
      monday_column_id: "texto9__1", // Nome da audiência no Houston
      form_field_path: "data.gam_houston_audience_name",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "anexos__1", // Print da Validation (arquivo)
      form_field_path: "data.gam_houston_validation_print",
      column_type: MondayColumnType.FILE
    },
    {
      monday_column_id: "lookup_mkrtcctn2", // Canais GAM (para Houston Query)
      form_field_path: "data.gam_houston_query_channels",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto10__1", // Observações (para Houston Query)
      form_field_path: "data.gam_houston_query_observations",
      column_type: MondayColumnType.TEXT
    },
    
    // ===== CAMPOS DE BRIEFING FALTANTES =====
    
    // Campos básicos de briefing
    {
      monday_column_id: "sele__o_individual9__1", // Tipo de Briefing
      form_field_path: "data.sele__o_individual9__1",
      column_type: MondayColumnType.STATUS
    },
    {
      monday_column_id: "long_text_mksehp7a", // Contexto da Comunicação
      form_field_path: "data.long_text_mksehp7a",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "sele__o_m_ltipla__1", // Objetivo Principal da Comunicação
      form_field_path: "data.sele__o_m_ltipla__1",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "sele__o_m_ltipla1__1", // Ação Esperada
      form_field_path: "data.sele__o_m_ltipla1__1",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "texto_curto23__1", // Chamada para ação (CTA)
      form_field_path: "data.texto_curto23__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto_curto8__1", // Obrigatoriedades
      form_field_path: "data.texto_curto8__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "data__1", // Data de entrega desejada
      form_field_path: "data.data__1",
      column_type: MondayColumnType.DATE
    },
    {
      monday_column_id: "lista_suspensa__1", // Benefício do Produto
      form_field_path: "data.lista_suspensa__1",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "lista_suspensa9__1", // Gatilho mental
      form_field_path: "data.lista_suspensa9__1",
      column_type: MondayColumnType.DROPDOWN
    },
    {
      monday_column_id: "sele__o_m_ltipla18__1", // Tipo de Entrega
      form_field_path: "data.sele__o_m_ltipla18__1",
      column_type: MondayColumnType.DROPDOWN
    },
    
    // Campos específicos para Conteúdo/Redes Sociais
    {
      monday_column_id: "text_mksn5est", // Hero
      form_field_path: "data.text_mksn5est",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mksns2p1", // Tensão/Oportunidade
      form_field_path: "data.text_mksns2p1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "long_text_mksn15gd", // Posicionamento e mensagem Principal
      form_field_path: "data.long_text_mksn15gd",
      column_type: MondayColumnType.TEXT
    },
    
    // Campo específico para Validação
    {
      monday_column_id: "long_text_mkrd6mnt", // Links úteis para validação
      form_field_path: "data.long_text_mkrd6mnt",
      column_type: MondayColumnType.TEXT
    },
    
    // ===== CAMPOS NUMÉRICOS DE TIPO DE ENTREGA =====
    
    {
      monday_column_id: "n_meros8__1", // Anúncio | Revista | Impresso
      form_field_path: "data.n_meros8__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros077__1", // Banner | Home
      form_field_path: "data.n_meros077__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros5__1", // Banner | Store
      form_field_path: "data.n_meros5__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros_mkn5hh88", // Banner DM
      form_field_path: "data.n_meros_mkn5hh88",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros_mkn5w9c", // Banner Notificação
      form_field_path: "data.n_meros_mkn5w9c",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros_mkn5pst6", // Banner Pix
      form_field_path: "data.n_meros_mkn5pst6",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros37__1", // Webview
      form_field_path: "data.n_meros37__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "numeric_mkqqwthm", // WhatsApp Carrossel
      form_field_path: "data.numeric_mkqqwthm",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros__1", // Lojas de App
      form_field_path: "data.n_meros__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros9__1", // Push
      form_field_path: "data.n_meros9__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros43__1", // SMS
      form_field_path: "data.n_meros43__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros44__1", // Subjects
      form_field_path: "data.n_meros44__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros92__1", // Post estático
      form_field_path: "data.n_meros92__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros7__1", // Post animado
      form_field_path: "data.n_meros7__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros94__1", // Lâminas de WhatsApp
      form_field_path: "data.n_meros94__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros60__1", // KV
      form_field_path: "data.n_meros60__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros447__1", // DM
      form_field_path: "data.n_meros447__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros47__1", // In-App
      form_field_path: "data.n_meros47__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros942__1", // Enxoval social (capas, bio)
      form_field_path: "data.n_meros942__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros1__1", // E-mail MKT
      form_field_path: "data.n_meros1__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros430__1", // Display
      form_field_path: "data.n_meros430__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros41__1", // Outros
      form_field_path: "data.n_meros41__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros_mkn59dj1", // RCS
      form_field_path: "data.n_meros_mkn59dj1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros_mkn5ykp4", // In-App Full Screen
      form_field_path: "data.n_meros_mkn5ykp4",
      column_type: MondayColumnType.NUMBER
    },
    
    // Campos adicionais de redes sociais
    {
      monday_column_id: "n_meros64__1", // Facebook | Feed Carrossel
      form_field_path: "data.n_meros64__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros07__1", // Facebook | Feed Estático
      form_field_path: "data.n_meros07__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros03__1", // Facebook | Vídeo Feed
      form_field_path: "data.n_meros03__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros34__1", // Instagram | Copy
      form_field_path: "data.n_meros34__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros28__1", // Instagram | Feed Carrossel
      form_field_path: "data.n_meros28__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros800__1", // Instagram | Feed Estático
      form_field_path: "data.n_meros800__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros66__1", // Instagram | Story
      form_field_path: "data.n_meros66__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros2__1", // Instagram | Thumb
      form_field_path: "data.n_meros2__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros80__1", // Instagram | Vídeo Reels
      form_field_path: "data.n_meros80__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros38__1", // Twitter | Copy
      form_field_path: "data.n_meros38__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros87__1", // Twitter | Feed Carrossel
      form_field_path: "data.n_meros87__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros62__1", // Twitter | Feed Estático
      form_field_path: "data.n_meros62__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros0__1", // Twitter | Vídeo Feed
      form_field_path: "data.n_meros0__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros81__1", // YouTube | Vídeo
      form_field_path: "data.n_meros81__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros4__1", // Vídeo
      form_field_path: "data.n_meros4__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros02__1", // Validação de entrega para parceiro
      form_field_path: "data.n_meros02__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros32__1", // Slide-up
      form_field_path: "data.n_meros32__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros21__1", // Roteiro para influenciador
      form_field_path: "data.n_meros21__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros6__1", // Mídia Kit
      form_field_path: "data.n_meros6__1",
      column_type: MondayColumnType.NUMBER
    },
    {
      monday_column_id: "n_meros3__1", // Header de WhatsApp
      form_field_path: "data.n_meros3__1",
      column_type: MondayColumnType.NUMBER
    },
    
    // Campos de arquivo e texto adicional
    {
      monday_column_id: "enviar_arquivo__1", // Arquivos úteis e referências
      form_field_path: "data.enviar_arquivo__1",
      column_type: MondayColumnType.FILE
    },
    {
      monday_column_id: "texto_curto6__1", // Link da régua/fluxo de CRM
      form_field_path: "data.texto_curto6__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto_curto31__1", // Link da comunicação anterior
      form_field_path: "data.texto_curto31__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "texto_curto4__1", // Texto jurídico/disclaimers
      form_field_path: "data.texto_curto4__1",
      column_type: MondayColumnType.TEXT
    },
    {
      monday_column_id: "text_mkrtbysb", // Deep Link (para Webview)
      form_field_path: "data.text_mkrtbysb",
      column_type: MondayColumnType.TEXT
    }
  ]
};