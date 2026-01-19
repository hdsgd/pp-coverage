import { BoardConfig } from '../../src/utils/boardConfig';

describe('BoardConfig', () => {
  describe('CRM constants', () => {
    it('should have CRM_TIME_SLOTS_BOARD_ID defined', () => {
      expect(BoardConfig.CRM_TIME_SLOTS_BOARD_ID).toBe('9965fb6d-34c3-4df6-b1fd-a67013fbe950');
    });

    it('should have CRM_SECOND_BOARD_ID defined', () => {
      expect(BoardConfig.CRM_SECOND_BOARD_ID).toBe('7463706726');
    });

    it('should have CRM_SECOND_BOARD_GROUP_ID defined', () => {
      expect(BoardConfig.CRM_SECOND_BOARD_GROUP_ID).toBe('topics');
    });

    it('should have CRM_SECOND_BOARD_CONNECT_COLUMNS defined', () => {
      expect(BoardConfig.CRM_SECOND_BOARD_CONNECT_COLUMNS).toEqual([
        'text_mkvgjh0w',
        'conectar_quadros8__1',
      ]);
    });
  });

  describe('GAM constants', () => {
    it('should have GAM_TIME_SLOTS_BOARD_ID defined', () => {
      expect(BoardConfig.GAM_TIME_SLOTS_BOARD_ID).toBe('f0dec33d-a127-4923-8110-ebe741ce946b');
    });

    it('should have GAM_SECOND_BOARD_ID defined', () => {
      expect(BoardConfig.GAM_SECOND_BOARD_ID).toBe('7463706726');
    });

    it('should have GAM_SECOND_BOARD_GROUP_ID defined', () => {
      expect(BoardConfig.GAM_SECOND_BOARD_GROUP_ID).toBe('topics');
    });

    it('should have GAM_SECOND_BOARD_CONNECT_COLUMNS defined', () => {
      expect(BoardConfig.GAM_SECOND_BOARD_CONNECT_COLUMNS).toEqual([
        'text_mkvgjh0w',
        'conectar_quadros8__1',
      ]);
    });
  });

  describe('DEFAULT_SECOND_BOARD_CORRELATIONS', () => {
    it('should have default correlation structures', () => {
      expect(BoardConfig.DEFAULT_SECOND_BOARD_CORRELATIONS).toHaveProperty('fromSubmission');
      expect(BoardConfig.DEFAULT_SECOND_BOARD_CORRELATIONS).toHaveProperty('fromFirst');
    });

    it('should have fromSubmission with empty strings', () => {
      expect(BoardConfig.DEFAULT_SECOND_BOARD_CORRELATIONS.fromSubmission).toEqual([
        { id_submission: '', id_second_board: '' },
      ]);
    });

    it('should have fromFirst with empty strings', () => {
      expect(BoardConfig.DEFAULT_SECOND_BOARD_CORRELATIONS.fromFirst).toEqual([
        { id_first_board: '', id_second_board: '' },
      ]);
    });
  });

  describe('getCRMSecondBoardConfig', () => {
    it('should return complete CRM second board configuration', () => {
      const config = BoardConfig.getCRMSecondBoardConfig();

      expect(config).toHaveProperty('boardId');
      expect(config).toHaveProperty('groupId');
      expect(config).toHaveProperty('connectColumns');
      expect(config).toHaveProperty('timeSlotsBoard');
    });

    it('should return correct CRM board values', () => {
      const config = BoardConfig.getCRMSecondBoardConfig();

      expect(config.boardId).toBe('7463706726');
      expect(config.groupId).toBe('topics');
      expect(config.connectColumns).toEqual([
        'text_mkvgjh0w',
        'conectar_quadros8__1',
      ]);
      expect(config.timeSlotsBoard).toBe('9965fb6d-34c3-4df6-b1fd-a67013fbe950');
    });
  });

  describe('getGAMSecondBoardConfig', () => {
    it('should return complete GAM second board configuration', () => {
      const config = BoardConfig.getGAMSecondBoardConfig();

      expect(config).toHaveProperty('boardId');
      expect(config).toHaveProperty('groupId');
      expect(config).toHaveProperty('connectColumns');
      expect(config).toHaveProperty('timeSlotsBoard');
    });

    it('should return correct GAM board values', () => {
      const config = BoardConfig.getGAMSecondBoardConfig();

      expect(config.boardId).toBe('7463706726');
      expect(config.groupId).toBe('topics');
      expect(config.connectColumns).toEqual([
        'text_mkvgjh0w',
        'conectar_quadros8__1',
      ]);
      expect(config.timeSlotsBoard).toBe('f0dec33d-a127-4923-8110-ebe741ce946b');
    });
  });

  describe('board configuration consistency', () => {
    it('should have same second board ID for CRM and GAM', () => {
      expect(BoardConfig.CRM_SECOND_BOARD_ID).toBe(BoardConfig.GAM_SECOND_BOARD_ID);
    });

    it('should have same group ID for CRM and GAM second boards', () => {
      expect(BoardConfig.CRM_SECOND_BOARD_GROUP_ID).toBe(BoardConfig.GAM_SECOND_BOARD_GROUP_ID);
    });

    it('should have same connect columns for CRM and GAM second boards', () => {
      expect(BoardConfig.CRM_SECOND_BOARD_CONNECT_COLUMNS).toEqual(BoardConfig.GAM_SECOND_BOARD_CONNECT_COLUMNS);
    });

    it('should have different time slots boards for CRM and GAM', () => {
      expect(BoardConfig.CRM_TIME_SLOTS_BOARD_ID).not.toBe(BoardConfig.GAM_TIME_SLOTS_BOARD_ID);
    });
  });
});
