/**
 * Configuração centralizada de IDs de boards do Monday.com
 * Consolida constantes duplicadas em vários serviços
 */
export class BoardIds {
  /**
   * Board secundário usado por GAM e CRM (Fluxo de Marketing)
   */
  static readonly MARKETING_BOARD_ID = '7463706726';

  /**
   * Board de horários disponíveis para GAM
   */
  static readonly GAM_TIME_SLOTS_BOARD_ID = 'f0dec33d-a127-4923-8110-ebe741ce946b';

  /**
   * Board de horários disponíveis para CRM
   */
  static readonly CRM_TIME_SLOTS_BOARD_ID = '9965fb6d-34c3-4df6-b1fd-a67013fbe950';

  /**
   * Grupo padrão do board secundário
   */
  static readonly MARKETING_BOARD_GROUP_ID = 'topics';

  /**
   * Colunas de conexão para o board de marketing
   */
  static readonly MARKETING_BOARD_CONNECT_COLUMNS = [
    'text_mkvgjh0w', // Hora Nova
    'conectar_quadros8__1', // Campanhas & Briefings
  ];
}
