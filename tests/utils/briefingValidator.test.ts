import { BriefingValidator } from '../../src/utils/briefingValidator';

describe('BriefingValidator', () => {
  describe('validateGrowthBUMarcaFields', () => {
    it('should not add errors when all required fields are present', () => {
      const data = {
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      BriefingValidator.validateGrowthBUMarcaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should accept lookup_mkrt36cj as alternative to briefing_requesting_area', () => {
      const data = {
        lookup_mkrt36cj: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      BriefingValidator.validateGrowthBUMarcaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add error when required field is missing', () => {
      const data = {
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context'
      };
      const errors: string[] = [];

      BriefingValidator.validateGrowthBUMarcaFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Objetivo Principal da Comunicação');
    });

    it('should add error when field is empty string', () => {
      const data = {
        briefing_requesting_area: '',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      BriefingValidator.validateGrowthBUMarcaFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Área Solicitante');
    });
  });

  describe('validateConteudoRedesSociaisFields', () => {
    it('should not add errors when all required fields are present', () => {
      const data = {
        text_mksn5est: 'Hero',
        text_mksns2p1: 'Tension',
        long_text_mksn15gd: 'Positioning',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      BriefingValidator.validateConteudoRedesSociaisFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add error when Hero is missing', () => {
      const data = {
        text_mksns2p1: 'Tension',
        long_text_mksn15gd: 'Positioning',
        long_text_mksehp7a: 'Context'
      };
      const errors: string[] = [];

      BriefingValidator.validateConteudoRedesSociaisFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Hero');
    });
  });

  describe('validateValidacaoFields', () => {
    it('should not add errors when all required fields are present', () => {
      const data = {
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push',
        long_text_mkrd6mnt: 'https://validation-link.com'
      };
      const errors: string[] = [];

      BriefingValidator.validateValidacaoFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add error when validation links are missing', () => {
      const data = {
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      BriefingValidator.validateValidacaoFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Links úteis para validação');
    });
  });

  describe('validateTipoEntregaFields', () => {
    it('should not add errors when numeric field matches selected delivery type', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 5
      };
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should handle array of delivery types', () => {
      const data = {
        sele__o_m_ltipla18__1: ['Push', 'SMS'],
        n_meros9__1: 5,
        n_meros43__1: 3
      };
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add error when numeric field is missing', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Número de peças Push');
    });

    it('should add error when numeric field is zero or negative', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 0
      };
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('maior que zero');
    });

    it('should add error when Deep Link is missing for Webview', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Webview',
        n_meros37__1: 2
      };
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Deep Link');
    });

    it('should not add error when Deep Link is present for Webview', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Webview',
        n_meros37__1: 2,
        text_mkrtbysb: 'app://deeplink'
      };
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should not add errors when no delivery type is selected', () => {
      const data = {};
      const errors: string[] = [];

      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should validate all known delivery types', () => {
      const deliveryTypes = [
        { type: 'Banner | Home', field: 'n_meros077__1' },
        { type: 'Banner | Store', field: 'n_meros5__1' },
        { type: 'E-mail MKT', field: 'n_meros1__1' },
        { type: 'Vídeo', field: 'n_meros4__1' },
        { type: 'In-App', field: 'n_meros47__1' }
      ];

      deliveryTypes.forEach(({ type, field }) => {
        const data = {
          sele__o_m_ltipla18__1: type,
          [field]: 3
        };
        const errors: string[] = [];

        BriefingValidator.validateTipoEntregaFields(data, errors);

        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('validateSpecificFields', () => {
    it('should validate Growth/BU/Marca briefing type', () => {
      const data = {
        sele__o_individual9__1: 'Growth/BU/Marca',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 5
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });

    it('should validate growth variant', () => {
      const data = {
        sele__o_individual9__1: 'growth',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 5
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });

    it('should validate Conteúdo/Redes Sociais briefing type', () => {
      const data = {
        sele__o_individual9__1: 'Conteúdo/Redes Sociais',
        text_mksn5est: 'Hero',
        text_mksns2p1: 'Tension',
        long_text_mksn15gd: 'Positioning',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 3
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });

    it('should validate Validação briefing type', () => {
      const data = {
        sele__o_individual9__1: 'Validação',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push',
        long_text_mkrd6mnt: 'https://validation-link.com',
        n_meros9__1: 2
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });

    it('should throw error when Growth briefing is missing required fields', () => {
      const data = {
        sele__o_individual9__1: 'Growth/BU/Marca',
        briefing_requesting_area: 'Marketing'
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).toThrow(/Validação de campos condicionais falhou/);
    });

    it('should throw error when Conteúdo briefing is missing required fields', () => {
      const data = {
        sele__o_individual9__1: 'conteudo',
        text_mksn5est: 'Hero'
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).toThrow(/Validação de campos condicionais falhou/);
    });

    it('should throw error when Validação briefing is missing validation links', () => {
      const data = {
        sele__o_individual9__1: 'validacao',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push'
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).toThrow(/Links úteis para validação/);
    });

    it('should handle briefing_type field as alternative', () => {
      const data = {
        briefing_type: 'Growth',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 5
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });

    it('should not validate when briefing type is empty', () => {
      const data = {
        sele__o_individual9__1: '',
        some_field: 'value'
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });

    it('should validate case insensitively', () => {
      const data = {
        sele__o_individual9__1: 'GROWTH',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: 5
      };

      expect(() => BriefingValidator.validateSpecificFields(data)).not.toThrow();
    });
  });
});
