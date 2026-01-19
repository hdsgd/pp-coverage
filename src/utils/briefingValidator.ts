/**
 * Classe utilitária para validação de campos de briefing
 * Consolida as regras de validação duplicadas em vários serviços
 */
export class BriefingValidator {
  /**
   * Campos comuns a múltiplos tipos de briefing
   */
  private static readonly COMMON_REQUIRED_FIELDS = [
    { key: 'long_text_mksehp7a', name: 'Contexto da Comunicação' },
    { key: 'sele__o_m_ltipla__1', name: 'Objetivo Principal da Comunicação' },
    { key: 'sele__o_m_ltipla1__1', name: 'Ação Esperada' },
    { key: 'texto_curto23__1', name: 'Chamada para ação (CTA)' },
    { key: 'texto_curto8__1', name: 'Obrigatoriedades' },
    { key: 'data__1', name: 'Data de entrega desejada' },
    { key: 'lista_suspensa__1', name: 'Benefício do Produto' },
    { key: 'lista_suspensa9__1', name: 'Gatilho mental' },
    { key: 'sele__o_m_ltipla18__1', name: 'Tipo de Entrega' }
  ];

  /**
   * Campos específicos de Conteúdo/Redes Sociais
   */
  private static readonly CONTEUDO_SPECIFIC_FIELDS = [
    { key: 'text_mksn5est', name: 'Hero' },
    { key: 'text_mksns2p1', name: 'Tensão/Oportunidade' },
    { key: 'long_text_mksn15gd', name: 'Posicionamento e mensagem Principal' }
  ];

  /**
   * Valida array de campos obrigatórios
   */
  private static validateFields(
    data: Record<string, any>,
    fields: Array<{ key: string; name: string }>,
    errorMessage: string,
    errors: string[]
  ): void {
    for (const field of fields) {
      if (!data[field.key] || String(data[field.key]).trim() === '') {
        errors.push(`Campo "${field.name}" ${errorMessage}`);
      }
    }
  }

  /**
   * Validações para Growth/BU/Marca: todos os campos são obrigatórios
   */
  static validateGrowthBUMarcaFields(data: Record<string, any>, errors: string[]): void {
    const errorMessage = 'é obrigatório para briefings do tipo Growth/BU/Marca';
    
    // Validação especial para Área Solicitante (aceita briefing_requesting_area OU lookup_mkrt36cj)
    const hasAreaSolicitante = (data['briefing_requesting_area'] && String(data['briefing_requesting_area']).trim()) ||
                               (data['lookup_mkrt36cj'] && String(data['lookup_mkrt36cj']).trim());
    if (!hasAreaSolicitante) {
      errors.push(`Campo "Área Solicitante" ${errorMessage}`);
    }

    // Valida campos comuns
    this.validateFields(data, this.COMMON_REQUIRED_FIELDS, errorMessage, errors);
  }

  /**
   * Validações para Conteúdo/Redes Sociais: campos específicos de conteúdo
   */
  static validateConteudoRedesSociaisFields(data: Record<string, any>, errors: string[]): void {
    const errorMessage = 'é obrigatório para briefings do tipo Conteúdo/Redes Sociais';
    
    // Valida campos específicos de conteúdo
    this.validateFields(data, this.CONTEUDO_SPECIFIC_FIELDS, errorMessage, errors);
    
    // Valida campos comuns
    this.validateFields(data, this.COMMON_REQUIRED_FIELDS, errorMessage, errors);
  }

  /**
   * Validações para Validação: apenas campos básicos + links de validação
   */
  static validateValidacaoFields(data: Record<string, any>, errors: string[]): void {
    const errorMessage = 'é obrigatório para briefings do tipo Validação';
    
    const requiredFields = [
      { key: 'long_text_mksehp7a', name: 'Contexto da Comunicação' },
      { key: 'sele__o_m_ltipla18__1', name: 'Tipo de Entrega' },
      { key: 'long_text_mkrd6mnt', name: 'Links úteis para validação' }
    ];

    this.validateFields(data, requiredFields, errorMessage, errors);
  }

  /**
   * Validações para Tipo de Entrega: campos numéricos correspondentes devem ser preenchidos
   */
  static validateTipoEntregaFields(data: Record<string, any>, errors: string[]): void {
    const tipoEntrega = data['sele__o_m_ltipla18__1'];
    if (!tipoEntrega) return;

    const entregas = Array.isArray(tipoEntrega) ? tipoEntrega : [tipoEntrega];
    
    // Mapeamento entre tipos de entrega e campos numéricos obrigatórios
    const entregaMappings: Record<string, { field: string, name: string }> = {
      'Anúncio | Revista | Impresso': { field: 'n_meros8__1', name: 'Número de peças Anúncio | Revista | Impresso' },
      'Banner | Home': { field: 'n_meros077__1', name: 'Número de peças Banner | Home' },
      'Banner | Store': { field: 'n_meros5__1', name: 'Número de peças Banner | Store' },
      'Banner DM': { field: 'n_meros_mkn5hh88', name: 'Número de peças Banner DM' },
      'Banner Notificação': { field: 'n_meros_mkn5w9c', name: 'Número de peças Banner Notificação' },
      'Banner Pix': { field: 'n_meros_mkn5pst6', name: 'Número de peças Banner Pix' },
      'Webview': { field: 'n_meros37__1', name: 'Número de peças Webview' },
      'WhatsApp Carrossel': { field: 'numeric_mkqqwthm', name: 'Número de peças WhatsApp Carrossel' },
      'Lojas de App': { field: 'n_meros__1', name: 'Número de peças Lojas de App' },
      'Push': { field: 'n_meros9__1', name:'Número de peças Push' },
      'SMS': { field: 'n_meros43__1', name: 'Número de peças SMS' },
      'E-mail MKT': { field: 'n_meros1__1', name: 'Número de peças E-mail MKT' },
      'Vídeo': { field: 'n_meros4__1', name: 'Número de peças Vídeo' },
      'In-App': { field: 'n_meros47__1', name: 'Número de peças In-App' },
      'RCS': { field: 'n_meros_mkn59dj1', name: 'Número de peças RCS' },
      'Conteúdo | Instagram | Feed Estático': { field: 'n_meros800__1', name: 'Número de peças Conteúdo | Instagram | Feed Estático' },
      'Conteúdo | Instagram | Vídeo Reels': { field: 'n_meros80__1', name: 'Número de peças Conteúdo | Instagram | Vídeo Reels' },
      'Conteúdo | Twitter | Vídeo Feed': { field: 'n_meros0__1', name: 'Número de peças Conteúdo | Twitter | Vídeo Feed' },
      'Post animado': { field: 'n_meros7__1', name: 'Número de peças Post animado' },
      'Post estático': { field: 'n_meros92__1', name: 'Número de peças Post estático' },
      'Slide-up': { field: 'n_meros32__1', name: 'Número de peças Slide-up' },
      'Subjects': { field: 'n_meros44__1', name: 'Número de peças Subjects' },
      'Validação de entrega para parceiro': { field: 'n_meros02__1', name: 'Número de peças Validação de entrega para parceiro' },
      'Lâminas de WhatsApp': { field: 'n_meros94__1', name: 'Número de peças Lâminas de WhatsApp' },
      'Mídia Kit': { field: 'n_meros6__1', name: 'Número de peças Mídia Kit' }
    };

    for (const entrega of entregas) {
      const entregaStr = String(entrega).trim();
      const mapping = entregaMappings[entregaStr];
      
      if (mapping) {
        const value = data[mapping.field];
        if (!value || Number.isNaN(Number(value)) || Number(value) <= 0) {
          errors.push(`Campo "${mapping.name}" é obrigatório e deve ser um número maior que zero quando "${entregaStr}" é selecionado`);
        }
      }

      // Validação especial para Webview (precisa também do Deep Link)
      if (entregaStr === 'Webview') {
        if (!data['text_mkrtbysb'] || String(data['text_mkrtbysb']).trim() === '') {
          errors.push('Campo "Deep Link" é obrigatório quando "Webview" é selecionado');
        }
      }
    }
  }

  /**
   * Valida campos condicionais baseados nas regras de negócio do Briefing de Materiais Criativos
   */
  static validateSpecificFields(data: Record<string, any>): void {
    const errors: string[] = [];

    // Validação baseada no Tipo de Briefing (após mapeamentos)
    const briefingType = String(data.sele__o_individual9__1 || data.briefing_type || '').trim().toLowerCase();

    if (briefingType === 'growth/bu/marca' || briefingType === 'growth' || briefingType === 'bu' || briefingType === 'marca') {
      // Growth/BU/Marca: Todos os campos são obrigatórios
      this.validateGrowthBUMarcaFields(data, errors);
    } else if (briefingType === 'conteúdo/redes sociais' || briefingType === 'conteudo' || briefingType === 'redes sociais') {
      // Conteúdo/Redes Sociais: Campos específicos de conteúdo
      this.validateConteudoRedesSociaisFields(data, errors);
    } else if (briefingType === 'validação' || briefingType === 'validacao') {
      // Validação: Apenas campos básicos + links de validação
      this.validateValidacaoFields(data, errors);
    }

    // Validação de Tipo de Entrega: Se selecionado, campos numéricos correspondentes são obrigatórios
    this.validateTipoEntregaFields(data, errors);

    // Se houver erros, lançar exceção
    if (errors.length > 0) {
      throw new Error(`Validação de campos condicionais falhou:\n${errors.join('\n')}`);
    }
  }
}
