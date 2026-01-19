/**
 * Classe utilitária para configurações de boards Monday
 * Consolida constantes e configurações duplicadas entre os serviços
 */
export class BoardConfig {
  // Board IDs para CRM (formulário padrão)
  static readonly CRM_TIME_SLOTS_BOARD_ID = '9965fb6d-34c3-4df6-b1fd-a67013fbe950';
  static readonly CRM_SECOND_BOARD_ID = '7463706726';
  static readonly CRM_SECOND_BOARD_GROUP_ID = 'topics';
  static readonly CRM_SECOND_BOARD_CONNECT_COLUMNS = [
    'text_mkvgjh0w',
    'conectar_quadros8__1',
  ];

  // Board IDs para GAM (Google Ad Manager)
  static readonly GAM_TIME_SLOTS_BOARD_ID = 'f0dec33d-a127-4923-8110-ebe741ce946b';
  static readonly GAM_SECOND_BOARD_ID = '7463706726'; // Mesmo que CRM
  static readonly GAM_SECOND_BOARD_GROUP_ID = 'topics';
  static readonly GAM_SECOND_BOARD_CONNECT_COLUMNS = [
    'text_mkvgjh0w', // Hora Nova
    'conectar_quadros8__1', // Campanhas & Briefings
  ];

  /**
   * Estrutura padrão para correlações do segundo board
   */
  static readonly DEFAULT_SECOND_BOARD_CORRELATIONS = {
    fromSubmission: [
      { id_submission: '', id_second_board: '' },
    ],
    fromFirst: [
      { id_first_board: '', id_second_board: '' },
    ]
  };

  /**
   * Retorna as configurações do segundo board para CRM
   */
  static getCRMSecondBoardConfig() {
    return {
      boardId: this.CRM_SECOND_BOARD_ID,
      groupId: this.CRM_SECOND_BOARD_GROUP_ID,
      connectColumns: this.CRM_SECOND_BOARD_CONNECT_COLUMNS,
      timeSlotsBoard: this.CRM_TIME_SLOTS_BOARD_ID
    };
  }

  /**
   * Retorna as configurações do segundo board para GAM
   */
  static getGAMSecondBoardConfig() {
    return {
      boardId: this.GAM_SECOND_BOARD_ID,
      groupId: this.GAM_SECOND_BOARD_GROUP_ID,
      connectColumns: this.GAM_SECOND_BOARD_CONNECT_COLUMNS,
      timeSlotsBoard: this.GAM_TIME_SLOTS_BOARD_ID
    };
  }
}
