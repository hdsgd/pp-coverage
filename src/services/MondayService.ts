import axios from "axios";
import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { MondayBoard } from "../entities/MondayBoard";
import { MondayItem } from "../entities/MondayItem";
import { ChannelSchedule } from "../entities/ChannelSchedule";
import { Subscriber } from "../entities/Subscriber";
import * as fs from "fs";
import * as path from "path";
import FormData from "form-data";
import { FormSubmissionData, SubitemData } from '../dto/MondayFormMappingDto';

export class MondayService {
  private readonly mondayBoardRepository: Repository<MondayBoard>;
  private readonly mondayItemRepository: Repository<MondayItem>;
  private readonly channelScheduleRepository: Repository<ChannelSchedule>;
  private readonly subscriberRepository: Repository<Subscriber>;
  private readonly apiUrl = "https://api.monday.com/v2";
  private readonly fileApiUrl = "https://api.monday.com/v2/file";
  private readonly apiToken: string;

  // Mapeamento de board_relation columns para seus boards de taxonomia alvo
  // Usado para resolver nomes â†’ IDs ao atualizar relaÃ§Ãµes
  private readonly RELATION_TO_TARGET_BOARD: { [key: string]: string } = {
    'conectar_quadros7__1': '7400357748',  // Tipo Cliente
    'conectar_quadros6__1': '7400361115',  // MecÃ¢nica
    'conectar_quadros75__1': '7400353565', // Canal de ComunicaÃ§Ã£o
    'conectar_quadros2__1': '7400351371',  // Tipo de Campanha
    'conectar_quadros9__1': '7420083894',  // Objetivo (CORRIGIDO)
    'conectar_quadros0__1': '7400364599',  // Produto (CORRIGIDO)
    'conectar_quadros09__1': '7420104356', // Segmento
    'conectar_quadros__1': '7400379813',   // Formato de Material
  };

  // Mapeamento de IDs de colunas do Monday para nomes amigÃ¡veis do backend
  // Apenas campos com mapeamento explÃ­cito serÃ£o retornados na resposta
  // Mapeamento de column ID para board ID
  private readonly COLUMN_TO_BOARD: { [key: string]: string } = {
    // Board Principal (7410140027) - a maioria dos campos
    // NÃ£o precisa listar todos, apenas os dos outros boards

    // Board SecundÃ¡rio - Touchpoints (7463706726)
    // NOTA: data__1, n_meros__1, texto__1 existem em MÃšLTIPLOS boards
    // NÃ£o podemos mapeÃ¡-los aqui - o board serÃ¡ determinado pelo contexto do itemId

    // Campos GAM - salvos no BOARD PRINCIPAL (7410140027)
    // NÃ£o precisam estar mapeados aqui pois o padrÃ£o Ã© board principal

    // Campos de disparo CRM (salvos no board de touchpoints)
    'lista_suspensa5__1': '7463706726',
    'lista_suspensa53__1': '7463706726',
    'n_meros_mkkchcmk': '7463706726',
    'date_mkrk5v4c': '7463706726',
    'text_mkr3v9k3': '7463706726',
    'pessoas5__1': '7463706726',
    'text_mkrr6jkh': '7463706726',
    'texto6__1': '7463706726',
    'text_mkrrqsk6': '7463706726',
    'text_mkrr8dta': '7463706726',
    'text_mkrrg2hp': '7463706726',
    'text_mkrrna7e': '7463706726',
    'text_mkrra7df': '7463706726',
    'text_mkrrcnpx': '7463706726',
    'text_mkrr9edr': '7463706726',
    'text_mkrrmjcy': '7463706726',
    'text_mkrrxf48': '7463706726',
    'text_mkrrxpjd': '7463706726',
    'text_mkrrmmvv': '7463706726',
    'text_mkrrxqng': '7463706726',
    'text_mkrrhdh6': '7463706726',
    'text_mkrrraz2': '7463706726',
    'text_mkrrfqft': '7463706726',
    'text_mkrrjrnw': '7463706726',
    'text_mkw8et4w': '7463706726',
    'text_mkw8jfw0': '7463706726',
    'text_mkrrt32q': '7463706726',
    'text_mkrrhdf8': '7463706726',
    'text_mkvgjh0w': '7463706726',
    'text_mkr5kh2r': '7463706726',
    'text_mkr3jr1s': '7463706726',
    'text_mkr3n64h': '7463706726',

    // Board de Briefing/Marketing (9169887721)
    // NOTA: Alguns campos podem estar tanto no board principal quanto no de briefing
    // O update sÃ³ serÃ¡ feito se o item pertencer a esse board

    // NOTA: Campos de briefing (long_text_mksehp7a, sele__o_m_ltipla18__1, etc.) 
    // existem em AMBOS os boards:
    // - Board principal (7410140027): quando Ã© "Briefing de Materiais Criativos"
    // - Board de marketing (9169887721): item de briefing separado
    // NÃƒO mapeamos aqui para permitir atualizaÃ§Ã£o no board correto baseado no itemId
    
    // Campos especÃ­ficos que existem APENAS no board de marketing:

    // NOTA: Campos numÃ©ricos de quantidade (n_meros_*, n_mero__1) existem em AMBOS os boards
    // - Board principal (7410140027): quantidade de materiais da campanha
    // - Board de marketing (9169887721): quantidade de materiais do briefing
    // NÃƒO mapeamos aqui para permitir atualizaÃ§Ã£o em qualquer board onde o item existir

    // Campos do marketing board (jÃ¡ existentes)
    'status_1': '9169887721',
    'status_15': '9169887721',
    'pessoas7': '9169887721',
    'texto_longo17': '9169887721',
    'texto_curto8': '9169887721',
    'texto_longo2': '9169887721',
    'texto_longo93': '9169887721',
    'sele__o_m_ltipla8': '9169887721',
    'texto_curto6': '9169887721',
    'texto_longo8': '9169887721',
    'texto_curto65': '9169887721',
    'texto_longo455': '9169887721',
    'sele__o_m_ltipla17': '9169887721',
    'texto_curto7': '9169887721',
    'texto_curto2': '9169887721',
    'texto_longo9': '9169887721',
    'texto_curto24': '9169887721',
    'texto_longo1': '9169887721',
    'sele__o_m_ltipla2': '9169887721',
    'data64': '9169887721',
    'texto_curto85': '9169887721',
    'long_text_mkrdqn35': '9169887721',
    'texto_longo28': '9169887721',
    'texto_longo5': '9169887721',
    'sele__o_m_ltipla38': '9169887721',
    'texto_longo13': '9169887721',
    'texto_longo10': '9169887721',
    'data72': '9169887721',
    'texto_curto11': '9169887721',
    'texto_longo7': '9169887721',
    'texto_longo3': '9169887721',
    'texto_longo0': '9169887721',
    'texto_curto22': '9169887721',
    'texto_longo100': '9169887721',
    'texto_longo41': '9169887721',
    'texto_longo25': '9169887721',
    'texto_longo__1': '9169887721',
    'texto_curto0': '9169887721',
    'texto_longo6': '9169887721',
    'status_16': '9169887721',
    'texto_longo14': '9169887721',
    'texto_longo36': '9169887721',
    'texto_longo94': '9169887721',
    'texto_longo95': '9169887721',
    'texto_curto39': '9169887721',
    'texto_longo38': '9169887721',
    'texto_longo11': '9169887721',
    'conectar_quadros__1': '9169887721',
    'conectar_quadros3__1': '9169887721',
    'conectar_quadros91__1': '9169887721',
    'status': '9169887721',  // Status do briefing
    'texto3__1': '9169887721',  // Briefing ID NÃºmero
    'board_relation_mkmhpe1e': '9169887721',  // link to Campanhas & Briefings
  };

  private readonly COLUMN_ID_TO_BACKEND_NAME: { [key: string]: string } = {
    // Campos principais
    'label__1': 'tipoSolicitacao',
    // pessoas5__1 - campo existe em mÃºltiplos boards, serÃ¡ mapeado por contexto
    'pessoas__1': 'demandante', // Campo people usado no board principal (GAM, etc)
    'status': 'status',
    'sele__o_individual9__1': 'tipoBriefing',

    // Board Relations (taxonomia do formulÃ¡rio principal)
    'conectar_quadros7__1': 'tipoClienteRelation',
    'conectar_quadros2__1': 'tipoCampanhaRelation',
    'conectar_quadros6__1': 'mecanicaRelation',
    'conectar_quadros__1': 'areaSolicitanteRelation',
    'conectar_quadros75__1': 'canalRelation',
    'conectar_quadros4__1': 'beneficioRelation',
    'conectar_quadros5__1': 'eventoRelation',
    'conectar_quadros9__1': 'objetivoRelation', // Objetivo da campanha (GAM)
    'conectar_quadros0__1': 'produtoRelation', // Produto ou serviÃ§o (GAM)
    'conectar_quadros09__1': 'segmentoRelation', // Segmento de pÃºblico (GAM)
    'conectar_quadros84__1': 'objetivoRelation',
    'conectar_quadros01__1': 'perfilRelation',
    'conectar_quadros88__1': 'jornadaRelation',
    'conectar_quadros99__1': 'produtoServicoRelation',

    // Lookups
    'lookup_mkrt36cj': 'areaSolicitante',
    'lookup_mkrt66aq': 'tipo',
    'lookup_mkrtaebd': 'segmento',
    'lookup_mkrtcctn': 'canal',
    'lookup_mkrta7z1': 'beneficio',
    'lookup_mkrtvsdj': 'jornada',
    'lookup_mkrtxa46': 'evento',
    'lookup_mkrtwq7k': 'objetivo',
    'lookup_mkrtxgmt': 'perfil',

    // Datas
    'date_mkr6nj1f': 'dataInicio',
    'date_mkrj355f': 'dataFim',
    'data__1': 'dataEntrega',
    'data76': 'previsaoLancamento',
    'timerange_mkrmvz3': 'cronogramaCampanha',

    // Campos GAM
    'text_mkvhz8g3': 'tipoCliente',
    'text_mkvhedf5': 'tipoCampanha',
    'text_mkvhv5ma': 'mecanica',
    'text_mkvhvcw4': 'areaResponsavel',
    'text_mkvhammc': 'segmentoPublico',
    'text_mkvhwyzr': 'produtoServico',
    'text_mkvh2z7j': 'objetivoCampanha',
    'text_mkvhgbp8': 'canalGam',
    'text_mkvhqgvn': 'tipoDisparo',
    'dropdown_mks9mwp1': 'canaisGam',
    'color_mkrm8t9t': 'tipoFormato',
    'dropdown_mkrmt77x': 'campanhaGam',
    'text_mkrmjbhf': 'outroCampanhaGam',
    'text_mktssxcq': 'linkDirecionamentoBanners',
    'color_mkrn99jy': 'formatoAudiencia',
    'long_text_mkrnxnq7': 'observacoes',

    // Campos de briefing
    'long_text_mksehp7a': 'contextoComunicacao',
    'sele__o_m_ltipla__1': 'objetivoPrincipal',
    'sele__o_m_ltipla1__1': 'acaoEsperada',
    'texto_curto23__1': 'cta',
    'texto_curto8__1': 'obrigatoriedades',
    'lista_suspensa__1': 'beneficioProduto',
    'lista_suspensa9__1': 'gatilhoMental',
    'sele__o_m_ltipla18__1': 'tipoEntrega',
    'text_mksn5est': 'hero',
    'text_mksns2p1': 'tensaoOportunidade',
    'long_text_mksn15gd': 'posicionamentoMensagem',
    'long_text_mkrd6mnt': 'linksUteisValidacao',

    // Arquivos e textos
    'enviar_arquivo__1': 'arquivos',
    'arquivos': 'arquivos',
    'texto_curto6__1': 'linkReguaFluxo',
    'texto_curto31__1': 'linkComunicacaoAnterior',
    'texto_curto4__1': 'textoJuridico',
    'text_mkrtbysb': 'deepLink',
    'texto2__1': 'briefingId',
    'texto3__1': 'objetivoMaterial',
    'texto4__1': 'publicoAlvo',
    'texto5__1': 'observacoesBriefing',
    'texto6__1': 'nomeCanal', // Campo "Nome Canal" no board de touchpoints (7463706726)
    'texto7__1': 'nomeValidationAudiencia',
    'texto8__1': 'observacoesHoustonValidation',
    'texto9__1': 'nomeAudienciaHouston',
    'texto10__1': 'observacoesHoustonQuery',
    'anexos__1': 'printValidation',
    'lista_suspensa2__1': 'formatoAudiencia',
    'lookup_mkrtcctn2': 'canaisGamQuery',
    'briefing_type': 'tipoBriefing',
    'briefing_objective': 'objetivoComunicacao',
    'briefing_target_audience': 'acaoEsperada',
    'briefing_observations': 'observacoesBriefing',
    'briefing_requesting_area': 'areaSolicitante',

    // NÃºmeros e volumes
    'n_mero__1': 'volumeEstimado',
    'n_meros__1': 'lojasApp',
    'n_meros_mkn59dj1': 'rcs',
    'n_meros_mkn5pst6': 'bannerPix',
    'n_meros_mkn5hh88': 'bannerDm',
    'n_meros_mkn5ykp4': 'inAppFullScreen',
    'n_meros_mkn5w9c': 'bannerNotificacao',
    'n_meros3__1': 'headerWhatsApp',
    'n_meros8__1': 'anuncioRevista',
    'numeric_mkqqwthm': 'whatsappCarrossel',
    'n_meros6__1': 'midiaKit',
    'n_meros81__1': 'youtubeVideo',
    'n_meros0__1': 'twitterVideoFeed',
    'n_meros62__1': 'twitterFeedEstatico',
    'n_meros38__1': 'twitterCopy',
    'n_meros80__1': 'instagramVideoReels',
    'n_meros2__1': 'instagramThumb',
    'n_meros66__1': 'instagramStory',
    'n_meros800__1': 'instagramFeedEstatico',
    'n_meros28__1': 'instagramFeedCarrossel',
    'n_meros34__1': 'instagramCopy',
    'n_meros03__1': 'facebookVideoFeed',
    'n_meros07__1': 'facebookFeedEstatico',
    'n_meros64__1': 'facebookFeedCarrossel',
    'n_meros37__1': 'webview',
    'n_meros9__1': 'push',
    'n_meros43__1': 'sms',
    'n_meros44__1': 'subjects',
    'n_meros92__1': 'postEstatico',
    'n_meros7__1': 'postAnimado',
    'n_meros94__1': 'laminasWhatsapp',
    'n_meros60__1': 'kv',
    'n_meros447__1': 'dm',
    'n_meros47__1': 'inApp',
    'n_meros942__1': 'enxovalSocial',
    'n_meros1__1': 'emailMkt',
    'n_meros430__1': 'display',
    'n_meros41__1': 'outros',
    'n_meros4__1': 'video',
    'n_meros02__1': 'validacaoEntregaParceiro',
    'n_meros32__1': 'slideUp',
    'n_meros21__1': 'roteiro',
    'n_meros5__1': 'bannerStore',
    'n_meros077__1': 'bannerHome',

    // Campos de conexÃ£o
    'conectar_quadros8__1': 'itemPrincipalId',
    'conectar_quadros20__1': 'briefingConectado',
    'conectar_quadros87__1': 'canal',
    'conectar_quadros_mkkcnyr3': 'horario',
    'link_to_itens_filhos__1': 'touchpointsConectados',
    'board_relation_mkmhpe1e': 'relacaoBoardPrincipal',

    // Campos do Marketing Board (4659200788)
    'status_1': 'areaDemandante',
    'status_15': 'tipoBriefing',
    'pessoas7': 'demandante',
    'texto_longo17': 'contextoComunicacao',
    'texto_curto8': 'nomeCampanha',
    'texto_longo2': 'publicoAlvo',
    'texto_longo93': 'linkComunicacaoAnterior',
    'sele__o_m_ltipla8': 'produto',
    'texto_curto6': 'objetivoPrincipal',
    'texto_longo8': 'mecanica',
    'texto_curto65': 'obrigatoriedades',
    'texto_longo455': 'cta',
    'sele__o_m_ltipla17': 'acaoEsperada',
    'texto_curto7': 'hero',
    'texto_curto2': 'tensaoOportunidade',
    'texto_longo9': 'posicionamentoMensagem',
    'texto_curto24': 'disclaimerJuridico',
    'texto_longo1': 'linksUteisReferencias',
    'sele__o_m_ltipla2': 'tipoEntregaveis',
    'data64': 'dataEntrega',
    'texto_curto85': 'informeTipoOutros',
    'long_text_mkrdqn35': 'linksUteisValidacao',
    'n_mero_mkm0eb96': 'rcs',
    'n_mero13__1': 'bannerPix',
    'n_mero44__1': 'bannerDm',
    'n_mero6__1': 'inAppFullScreen',
    'n_mero1__1': 'bannerNotificacao',
    'n_mero4__1': 'lojasApp',
    'n_mero06': 'headerWhatsApp',
    'n_mero15': 'anuncioRevista',
    'numeric_mkqqbkx2': 'whatsappCarrossel',
    'n_mero587': 'midiaKit',
    'n_mero14': 'youtubeVideo',
    'n_mero9': 'twitterVideoFeed',
    'n_mero24': 'twitterFeedEstatico',
    'n_mero00': 'twitterCopy',
    'n_mero38': 'instagramVideoReels',
    'n_mero07': 'instagramThumb',
    'n_mero850': 'instagramStory',
    'n_mero27': 'instagramFeedEstatico',
    'n_mero83': 'instagramFeedCarrossel',
    'n_mero527': 'instagramCopy',
    'n_mero28': 'facebookVideoFeed',
    'n_mero84': 'facebookFeedEstatico',
    'n_mero71': 'facebookFeedCarrossel',
    'n_mero85': 'webview',
    'text_mkrtxtvw': 'deepLink',
    'n_mero73': 'bannerHome',
    'banner___store': 'bannerStore',
    'slide_up': 'slideUp',
    'n_mero05': 'validacaoEntregaParceiro',
    'n_mero16': 'video',
    'n_mero8': 'subjects',
    'n_mero50': 'sms',
    'n_mero52': 'roteiro',
    'n_mero2': 'push',
    'n_mero40': 'postEstatico',
    'n_mero6': 'postAnimado',
    'n_mero5': 'laminasWhatsapp',
    'n_mero0': 'kv',
    'n_mero39': 'dm',
    'n_mero1': 'inApp',
    'n_mero7': 'enxovalSocial',
    'n_mero3': 'emailMkt',
    'n_mero4': 'display',

    // Campos de subitems
    // 'data__1': 'data', // Comentado - duplicado com linha 236 (dataEntrega)
    // 'n_meros__1': 'numeroDisparo', // Comentado - duplicado com linha 298 (lojasApp)
    'texto__1': 'codigoProduto',
    'lista_suspensa5__1': 'tipoBeneficio',
    'lista_suspensa53__1': 'gatilhos',
    'n_meros_mkkchcmk': 'volumeDemanda',

    // Campos do segundo board (touchpoints - 7463706726)
    'date_mkrk5v4c': 'dataDisparo',
    'text_mkr3v9k3': 'dataFimDisparo',
    // pessoas5__1 - campo existe em mÃºltiplos boards, serÃ¡ mapeado por contexto
    'text_mkrr6jkh': 'itemPrincipalId',
    // 'texto6__1': 'taxonomiaDisparo', // Comentado - duplicado com linha 282 (taxonomia)
    'text_mkrrqsk6': 'codigoCanal',
    'text_mkrr8dta': 'nomeCanal',
    'text_mkrrg2hp': 'tipoClienteDisparo',
    'text_mkrrna7e': 'codigoTipoCliente',
    'text_mkrra7df': 'tipoCampanhaDisparo',
    'text_mkrrcnpx': 'codigoTipoCampanha',
    'text_mkrr9edr': 'eventoDisparo',
    'text_mkrrmjcy': 'codigoEvento',
    'text_mkrrxf48': 'beneficioDisparo',
    'text_mkrrxpjd': 'codigoBeneficio',
    'text_mkrrmmvv': 'areaSolicitanteDisparo',
    'text_mkrrxqng': 'codigoAreaSolicitante',
    'text_mkrrhdh6': 'objetivoDisparo',
    'text_mkrrraz2': 'codigoObjetivo',
    'text_mkrrfqft': 'jornadaDisparo',
    'text_mkrrjrnw': 'codigoJornada',
    'text_mkw8et4w': 'outrosCampo1',
    'text_mkw8jfw0': 'outrosCampo2',
    'text_mkrrt32q': 'perfilDisparo',
    'text_mkrrhdf8': 'codigoPerfil',
    'text_mkvgjh0w': 'horarioDisparo',
    'text_mkr5kh2r': 'nomeTouchpoint',
    'text_mkr3jr1s': 'nomeTouchpointAlternativo',
    'text_mkr3n64h': 'campoCalculado'
  };

  constructor() {
    this.mondayBoardRepository = AppDataSource.getRepository(MondayBoard);
    this.mondayItemRepository = AppDataSource.getRepository(MondayItem);
    this.channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
    this.subscriberRepository = AppDataSource.getRepository(Subscriber);
    this.apiToken = process.env.MONDAY_API_TOKEN || "";
  }

  public async makeGraphQLRequest(query: string): Promise<any> {
    try {
      const response = await axios.post(
        this.apiUrl,
        { query },
        {
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
            "API-Version": "2023-10",
          },
        }
      );
      
      const data = response.data as any;
      if (data == null) {
        console.warn("Monday API retornou resposta nula para a query fornecida.");
        return null;
      }
      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        throw new Error(`Monday API Error: ${JSON.stringify(data.errors)}`);
      }
      
      return data;
    } catch (error: any) {
      console.error("Erro ao fazer requisiÃ§Ã£o para Monday API:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw new Error("Falha na comunicação com Monday API");
    }
  }

  async getAllBoards(): Promise<MondayBoard[]> {
    return await this.mondayBoardRepository.find({
      where: { is_active: true },
    });
  }

  async getBoardById(id: string): Promise<MondayBoard | null> {
    return await this.mondayBoardRepository.findOne({
      where: { id, is_active: true },
    });
  }

  async getBoardByMondayId(board_id: string): Promise<MondayBoard | null> {
    return await this.mondayBoardRepository.findOne({
      where: { board_id, is_active: true },
    });
  }

  async createBoard(boardData: {
    name: string;
    board_id: string;
    description?: string;
    query_fields?: string[];
  }): Promise<MondayBoard> {
    const board = this.mondayBoardRepository.create({
      name: boardData.name,
      board_id: boardData.board_id,
      description: boardData.description,
      query_fields: boardData.query_fields || ["id", "name", "status"]
    });
    return await this.mondayBoardRepository.save(board);
  }

  async updateBoard(id: string, boardData: Partial<MondayBoard>): Promise<MondayBoard | null> {
    const board = await this.mondayBoardRepository.findOne({ where: { id } });
    if (!board) {
      throw new Error("Board não encontrado");
    }
    
    Object.assign(board, boardData);
    return await this.mondayBoardRepository.save(board);
  }

  async deleteBoard(id: string): Promise<void> {
    let existingBoard;
    try {
      existingBoard = await this.mondayBoardRepository.findOne({ where: { id } });
    } catch {
      existingBoard = undefined;
    }
    
    const result = await this.mondayBoardRepository.delete(id);

    const affected = result?.affected ?? 0;
    if (affected === 0) {
      if (existingBoard === null) {
        return;
      }
      throw new Error("Board não encontrado");
    }
  }

  async getItemsByBoard(boardId: string): Promise<MondayItem[]> {
    if (!boardId) {
      return [];
    }

    try {
      const createQueryBuilder = (this.mondayItemRepository as any).createQueryBuilder;
      if (typeof createQueryBuilder === 'function') {
        const queryBuilder = createQueryBuilder.call(this.mondayItemRepository, "item");

        if (queryBuilder && typeof queryBuilder.leftJoinAndSelect === 'function') {
          const queryResult = await queryBuilder
            .leftJoinAndSelect("item.board", "board")
            .where("item.board_id = :boardId", { boardId })
            .orderBy("item.created_at", "ASC")
            .getMany();

          if (Array.isArray(queryResult) && queryResult.length > 0) {
            return queryResult;
          }
        }
      }
    } catch (error) {
      console.warn('Fallback para find em getItemsByBoard devido a erro no QueryBuilder:', error);
    }

    const fallbackItems = await this.mondayItemRepository.find({
      where: { board_id: boardId }
    } as any);

    return Array.isArray(fallbackItems) ? fallbackItems : [];
  }

  async getItemsCountByBoard(boardId: string): Promise<number> {
    return await this.mondayItemRepository.count({
      where: { board_id: boardId }
    });
  }

  async syncBoardData(boardId?: string): Promise<void> {
    try {
      let boards: MondayBoard[];
      
      if (boardId) {
        const board = await this.mondayBoardRepository.findOne({ 
          where: { id: boardId, is_active: true } 
        });
        if (!board) {
          throw new Error("Board não encontrado ou inativo");
        }
        boards = [board];
      } else {
        boards = await this.getAllBoards();
      }

      for (const board of boards) {
        await this.syncSingleBoard(board);
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados do Monday:", error);
      throw error;
    }
  }

  private async syncSingleBoard(board: MondayBoard): Promise<void> {
    try {
      const allItems = await this.fetchAllBoardItems(board.board_id, board.query_fields);
      await this.saveActiveItems(allItems, board.id);
      console.log(`Sincronizado ${allItems.length} itens do board ${board.name}`);
    } catch (error) {
      console.error(`Erro ao sincronizar board ${board.name}:`, error);
      throw error;
    }
  }

  private normalizeQueryFields(queryFields?: string[] | string | null): string[] {
    if (!queryFields) {
      return [];
    }

    if (Array.isArray(queryFields)) {
      return queryFields
        .map((field) => (typeof field === 'string' ? field.trim() : String(field).trim()))
        .filter((field) => field.length > 0);
    }

    if (typeof queryFields === 'string') {
      try {
        const parsed = JSON.parse(queryFields);
        if (Array.isArray(parsed)) {
          return parsed
            .map((field) => (typeof field === 'string' ? field.trim() : String(field).trim()))
            .filter((field) => field.length > 0);
        }
      } catch {
        // Ignora erro de parse; tenta dividir manualmente abaixo
      }

      return queryFields
        .split(/[\s,]+/)
        .map((field) => field.trim())
        .filter((field) => field.length > 0);
    }

    return [];
  }

  private async fetchAllBoardItems(boardId: string, queryFields?: string[] | string | null): Promise<any[]> {
  // Separar campos bÃ¡sicos dos campos de column_values
    const basicFields = ['id', 'name'];
  // Garantir que os campos necessÃ¡rios para sincronizaÃ§Ã£o local sempre sejam buscados
    const requiredFields = ['texto__1', 'multiple_person_mkqj7n5b', 'text_mkw213jk'];
    const normalizedQueryFields = this.normalizeQueryFields(queryFields);
    const columnValueFields = Array.from(
      new Set([
        ...normalizedQueryFields.filter((field: string) => !basicFields.includes(field)),
        ...requiredFields,
      ]),
    );
    
    // Construir a parte de column_values se houver campos especÃ­ficos
    let columnValuesQuery = '';
    if (columnValueFields.length > 0) {
      const columnIds = columnValueFields.map(field => `"${field}"`).join(',');
      columnValuesQuery = `
        column_values(ids:[${columnIds}]){         
          id
          text
          value
          column {
            id
            title
          }
        }`;
    }

    const query = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
          items_page(limit: 500) {
            cursor
            items {
              id 
              name${columnValuesQuery ? `
              ${columnValuesQuery}` : ''}
            }
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest(query);
    
    if (!response?.data?.boards?.[0]) {
      return [];
    }

    const mondayBoard = response.data.boards[0];
    let allItems = mondayBoard.items_page.items;
    let cursor = mondayBoard.items_page.cursor;
    
  // Buscar mais itens se houver paginaÃ§Ã£o
    while (cursor) {
      const nextItems = await this.fetchNextPage(cursor, queryFields);
      if (nextItems.items.length > 0) {
        allItems = allItems.concat(nextItems.items);
        cursor = nextItems.cursor;
      } else {
        cursor = null;
      }
    }
    
    return allItems;
  }

  private async fetchNextPage(cursor: string, queryFields?: string[] | string | null): Promise<{items: any[], cursor: string | null}> {
  // Separar campos bÃ¡sicos dos campos de column_values
    const basicFields = ['id', 'name'];
    const requiredFields = ['texto__1', 'multiple_person_mkqj7n5b', 'text_mkw213jk'];
    const normalizedQueryFields = this.normalizeQueryFields(queryFields);
    const columnValueFields = Array.from(
      new Set([
        ...normalizedQueryFields.filter((field: string) => !basicFields.includes(field)),
        ...requiredFields,
      ]),
    );
    
    // Construir a parte de column_values se houver campos especÃ­ficos
    let columnValuesQuery = '';
    if (columnValueFields.length > 0) {
      const columnIds = columnValueFields.map(field => `"${field}"`).join(',');
      columnValuesQuery = `
        column_values(ids:[${columnIds}]){         
          id
          text
          value
          column {
            id
            title
          }
        }`;
    }

    const nextQuery = `
      query {
        next_items_page(cursor: "${cursor}") {
          cursor
          items {
            id 
            name${columnValuesQuery ? `
            ${columnValuesQuery}` : ''}
          }
        }
      }
    `;
    
    const nextResponse = await this.makeGraphQLRequest(nextQuery);
    const nextItemsPage = nextResponse?.data?.next_items_page
      || nextResponse?.data?.boards?.[0]?.items_page
      || null;

    const items = Array.isArray(nextItemsPage?.items) ? nextItemsPage.items : [];
    const nextCursor = nextItemsPage?.cursor ?? null;

    return {
      items,
      cursor: nextCursor
    };
  }

  private async saveActiveItems(items: any[], boardId: string): Promise<void> {
    // Limpar itens existentes para recarregar
    await this.mondayItemRepository.delete({ board_id: boardId });
    
    for (const item of items) {
      // Extrair max_value baseado no tÃ­tulo da coluna "Max Volume Hora"
      const maxValue = this.getMaxVolumeValue(item);

      // Extrair campos adicionais
      const code = this.getColumnValueById(item, 'texto__1') || this.getColumnValueById(item, 'text_mkw2kskm');
      const teamList = this.getPeopleArrayById(item, 'multiple_person_mkqj7n5b');
      const product = this.getColumnValueById(item, 'text_mkw213jk');

      const mondayItem = this.mondayItemRepository.create({
        item_id: item.id,
        name: item.name,
  status: this.getItemStatus(item),
        max_value: maxValue,
        board_id: boardId,
        code,
        team: teamList.length ? teamList : undefined,
        product,
      });
      
      await this.mondayItemRepository.save(mondayItem);
    }
  }
  private getItemStatus(item: any): string {
    if (!item.column_values || item.column_values.length === 0) {
  return "Ativo";
    }
    
    // Procurar por coluna de status baseada no tÃ­tulo da coluna
    const statusColumn = item.column_values.find((col: any) => 
      col.column?.title === "Status" || col.id === 'status' || col.id === 'status__1'
    );
    
    if (statusColumn?.text) {
      return statusColumn.text;
    }
    
  // Se nÃ£o encontrar coluna especÃ­fica de status, usar o primeiro column_value se disponÃ­vel
    if (item.column_values.length > 0 && item.column_values[0].text) {
      const text = item.column_values[0].text.trim();
      if (text === "Ativo" || text === "Inativo") {
        return text;
      }
    }
  return "Ativo";
  }

  private getColumnValueByTitle(item: any, columnTitle: string): string | null {
    if (!item.column_values || item.column_values.length === 0) {
      return null;
    }
    
    const column = item.column_values.find((col: any) => 
      col.column?.title === columnTitle
    );
    
    return column?.text || null;
  }

  /**
   * Retorna o texto de uma coluna pelo ID (ex.: 'texto__1').
   */
  private getColumnValueById(item: any, columnId: string): string | null {
    const cvs = Array.isArray(item?.column_values) ? item.column_values : [];
    const cv = cvs.find((c: any) => c?.id === columnId);
    if (!cv) return null;
    const txt = typeof cv.text === 'string' ? cv.text.trim() : '';
    return txt || null;
  }

  /**
   * Extrai IDs de pessoas/times de uma coluna People pelo ID (ex.: 'multiple_person_mkqj7n5b').
   * Tenta ler 'value' como JSON e retornar personsAndTeams[].id como strings.
   * Como fallback, divide 'text' por vÃ­rgulas e retorna nomes.
   */
  private getPeopleArrayById(item: any, columnId: string): string[] {
    const cvs = Array.isArray(item?.column_values) ? item.column_values : [];
    const cv = cvs.find((c: any) => c?.id === columnId);
    if (!cv) return [];
  // Primeiro tenta via value JSON
    const rawVal = cv.value;
    if (rawVal) {
      try {
        const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
        const arr = Array.isArray(parsed?.personsAndTeams) ? parsed.personsAndTeams : [];
        const ids = arr
          .map((p: any) => (p?.id !== undefined && p?.id !== null ? String(p.id) : ''))
          .filter((s: string) => s.trim().length > 0);
        if (ids.length) return ids;
      } catch {
        // ignora
      }
    }
  // Fallback: usar texto separado por vÃ­rgulas
    const txt = typeof cv.text === 'string' ? cv.text : '';
    if (!txt) return [];
    return txt
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  private getMaxVolumeValue(item: any): number | undefined {
    const maxVolumeText = this.getColumnValueByTitle(item, "Max Volume Hora");
    
    if (maxVolumeText && !isNaN(parseFloat(maxVolumeText))) {
      return parseFloat(maxVolumeText);
    }
    
    return undefined;
  }

  async initializeDefaultBoards(): Promise<void> {
    const defaultBoards = [
      { 
        name: "Ãrea Solicitante", 
        board_id: "7400348232", 
        description: "Board para Ã¡rea solicitante - Controla as Ã¡reas que podem solicitar campanhas",
        query_fields: ["id", "name", "status__1", "created_at__1"]
      },
      { 
        name: "Tipo de Campanha", 
        board_id: "7400351371", 
        description: "Board para tipo de campanha - Define os tipos de campanhas disponÃ­veis",
        query_fields: ["id", "name", "status__1", "group__1"]
      },
      { 
        name: "Tipo de Cliente", 
        board_id: "7400357748", 
        description: "Board para tipo de cliente - SegmentaÃ§Ã£o de tipos de clientes para campanhas",
        query_fields: ["id", "name", "status__1", "subscribers__1"]
      },
      { 
        name: "Canal", 
        board_id: "7400353565", 
        description: "Board para canal - Canais de comunicaÃ§Ã£o disponÃ­veis para campanhas",
        query_fields: ["id", "name", "status__1", "updated_at__1", "numeric_mktmre00"]
      },
      { 
        name: "MecÃ¢nica", 
        board_id: "7400361115", 
        description: "Board para mecÃ¢nica - MecÃ¢nicas de campanhas e promoÃ§Ãµes disponÃ­veis",
        query_fields: ["id", "name", "status__1", "creator_id__1"]
      },
      { 
        name: "Produto", 
        board_id: "7400364599", 
        description: "Board para produto - Produtos PicPay disponÃ­veis para campanhas",
        query_fields: ["id", "name", "status__1", "email__1"]
      },
    ];

    const results = { createdCount: 0, updatedCount: 0, existingCount: 0 };

    for (const boardData of defaultBoards) {
      try {
        const result = await this.processDefaultBoard(boardData);
        results.createdCount += result.created ? 1 : 0;
        results.updatedCount += result.updated ? 1 : 0;
        results.existingCount += result.existing ? 1 : 0;
      } catch (error) {
        console.error(`âœ— Erro ao processar board ${boardData.name}:`, error);
        throw error;
      }
    }

    this.logInitializationResults(results, defaultBoards.length);
  }

  private async processDefaultBoard(boardData: {
    name: string;
    board_id: string;
    description?: string;
    query_fields?: string[];
  }): Promise<{ created: boolean; updated: boolean; existing: boolean }> {
    const existingBoard = await this.mondayBoardRepository.findOne({
      where: { board_id: boardData.board_id },
    });

    if (!existingBoard) {
      await this.createBoard(boardData);
  console.log(`Board criado: ${boardData.name} (ID: ${boardData.board_id})`);
      return { created: true, updated: false, existing: false };
    }

    const needsUpdate = this.checkIfBoardNeedsUpdate(existingBoard, boardData);
    
    if (needsUpdate) {
      await this.updateExistingBoard(existingBoard, boardData);
  console.log(`Board atualizado: ${boardData.name} (ID: ${boardData.board_id})`);
      return { created: false, updated: true, existing: false };
    }

  console.log(`Board jÃ¡ configurado: ${boardData.name} (ID: ${boardData.board_id})`);
    return { created: false, updated: false, existing: true };
  }

  private checkIfBoardNeedsUpdate(existingBoard: MondayBoard, boardData: any): boolean {
    return !existingBoard.query_fields || 
           existingBoard.query_fields.length === 0 ||
           existingBoard.description !== boardData.description ||
           existingBoard.name !== boardData.name ||
           !existingBoard.is_active;
  }

  private async updateExistingBoard(existingBoard: MondayBoard, boardData: any): Promise<void> {
    if (!existingBoard.query_fields || existingBoard.query_fields.length === 0) {
      existingBoard.query_fields = boardData.query_fields;
    }
    
    if (existingBoard.description !== boardData.description) {
      existingBoard.description = boardData.description;
    }
    
    if (existingBoard.name !== boardData.name) {
      existingBoard.name = boardData.name;
    }
    
    if (!existingBoard.is_active) {
      existingBoard.is_active = true;
    }

    await this.mondayBoardRepository.save(existingBoard);
  }

  private logInitializationResults(results: { createdCount: number; updatedCount: number; existingCount: number }, totalBoards: number): void {
  console.log(`InicializaÃ§Ã£o dos boards concluÃ­da:`);
  console.log(` - Boards criados: ${results.createdCount}`);
  console.log(` - Boards atualizados: ${results.updatedCount}`);
  console.log(` - Boards jÃ¡ existentes: ${results.existingCount}`);
  console.log(` - Total de boards configurados: ${totalBoards}`);
  }

  async getAllActiveItems(): Promise<MondayItem[]> {
    const items = await this.mondayItemRepository.find({
      where: { status: "Ativo" },
      relations: ["board"],
    });

    // Ordenar alfabeticamente por nome
    return items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }

  async getBoardInfo(boardId: string, queryFields?: string[]): Promise<any> {
    // Separar campos bÃ¡sicos dos campos de column_values
    const basicFields = ['id', 'name'];
    const columnValueFields = queryFields?.filter(field => !basicFields.includes(field)) || [];
    
    // Construir a parte de column_values se houver campos especÃ­ficos
    let columnValuesQuery = '';
    if (columnValueFields.length > 0) {
      const columnIds = columnValueFields.map(field => `"${field}"`).join(',');
      columnValuesQuery = `
        column_values(ids:[${columnIds}]){         
          text
          column {
            title
          }
        }`;
    }

    const query = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
          description
          state
          board_folder_id
          columns {
            id
            title
            type
            settings_str
          }
          items_page(limit: 10) {
            cursor
            items {
              id 
              name${columnValuesQuery ? `
              ${columnValuesQuery}` : ''}
            }
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest(query);
    return response.data?.boards?.[0] || null;
  }

  async syncBoardById(boardDatabaseId: string): Promise<{success: boolean, message: string, itemsCount: number}> {
    try {
      // Buscar o board no banco de dados
      const board = await this.mondayBoardRepository.findOne({ 
        where: { id: boardDatabaseId, is_active: true } 
      });
      
      if (!board) {
        throw new Error("Board não encontrado ou inativo no banco de dados");
      }

      const allItems = await this.fetchAllBoardItems(board.board_id, board.query_fields);
      const savedItemsCount = await this.upsertActiveItems(allItems, board.id);
      
  console.log(`Sincronizado ${savedItemsCount} itens do board ${board.name} (ID: ${board.board_id})`);
      
      return {
        success: true,
        message: `Board '${board.name}' sincronizado com sucesso`,
        itemsCount: savedItemsCount
      };
    } catch (error) {
      console.error(`Erro ao sincronizar board ID ${boardDatabaseId}:`, error);
      throw error;
    }
  }

  private async upsertActiveItems(items: any[], boardId: string): Promise<number> {
    let savedCount = 0;
    
    for (const item of items) {
      // Verificar se o item jÃ¡ existe
      const existingItem = await this.mondayItemRepository.findOne({
        where: { 
          item_id: item.id,
          board_id: boardId 
        }
      });

      // Extrair max_value baseado no tÃ­tulo da coluna "Max Volume Hora"
      const maxValue = this.getMaxVolumeValue(item);

      // Extrair campos adicionais
      const code = this.getColumnValueById(item, 'texto__1') || this.getColumnValueById(item, 'text_mkw2kskm');
      const teamList = this.getPeopleArrayById(item, 'multiple_person_mkqj7n5b');
      const product = this.getColumnValueById(item, 'text_mkw213jk');

      const itemData = {
        item_id: item.id,
        name: item.name,
        status: this.getItemStatus(item), // Usar o status real do item
        max_value: maxValue,
        board_id: boardId,
        code,
        team: teamList.length ? teamList : undefined,
        product,
      };

      if (existingItem) {
        // Atualizar item existente
        Object.assign(existingItem, itemData);
        await this.mondayItemRepository.save(existingItem);
      } else {
        // Criar novo item
        const mondayItem = this.mondayItemRepository.create(itemData);
        await this.mondayItemRepository.save(mondayItem);
      }
      
      savedCount++;
    }
    
    return savedCount;
  }

  async testConnection(): Promise<boolean> {
    try {
      const query = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      return !!response.data?.me;
    } catch (error) {
      console.error("Erro ao testar conexÃ£o com Monday:", error);
      return false;
    }
  }

  async syncBoardByDatabaseId(boardDatabaseId: string): Promise<{success: boolean, message: string, itemsCount: number, boardName: string}> {
    try {
      // Buscar o board no banco de dados
      const board = await this.mondayBoardRepository.findOne({ 
        where: { id: boardDatabaseId, is_active: true } 
      });
      
      if (!board) {
        throw new Error("Board não encontrado ou inativo no banco de dados");
      }

      // Fazer a requisição para o Monday.com usando os query_fields do board
      const allItems = await this.fetchAllBoardItems(board.board_id, board.query_fields);
      
      // Salvar apenas os itens do array 'items' na tabela monday_items
      const savedItemsCount = await this.saveItemsToDatabase(allItems, board.id);
      
      console.log(`Sincronizado ${savedItemsCount} itens do board ${board.name} (ID: ${board.board_id})`);
      
      return {
        success: true,
        message: `Board '${board.name}' sincronizado com sucesso`,
        itemsCount: savedItemsCount,
        boardName: board.name
      };
    } catch (error) {
      console.error(`Erro ao sincronizar board ID ${boardDatabaseId}:`, error);
      throw error;
    }
  }  

  private async saveItemsToDatabase(items: any[], boardId: string): Promise<number> {
    let savedCount = 0;
    
    for (const item of items) {
      // Verificar se o item jÃ¡ existe na tabela
      const existingItem = await this.mondayItemRepository.findOne({
        where: { 
          item_id: item.id,
          board_id: boardId 
        }
      });

      // Extrair max_value baseado no tÃ­tulo da coluna "Max Volume Hora"
      const maxValue = this.getMaxVolumeValue(item);

      // Extrair cÃ³digo (texto__1) e time (multiple_person_mkqj7n5b)
      const code = this.getColumnValueById(item, 'texto__1') || this.getColumnValueById(item, 'text_mkw2kskm');
      const teamList = this.getPeopleArrayById(item, 'multiple_person_mkqj7n5b');
      const product = this.getColumnValueById(item, 'text_mkw213jk');

      const itemData = {
        item_id: item.id,
        name: item.name || 'Item sem nome',
  status: this.getItemStatus(item),
        max_value: maxValue,
        board_id: boardId,
        code,
        team: teamList.length ? teamList : undefined,
        product,
      };

      if (existingItem) {
        // Atualizar item existente (nÃ£o criar nova linha)
        Object.assign(existingItem, itemData);
        existingItem.updated_at = new Date();
        await this.mondayItemRepository.save(existingItem);
      } else {
        // Criar novo item
        const mondayItem = this.mondayItemRepository.create(itemData);
        await this.mondayItemRepository.save(mondayItem);
      }
      
      savedCount++;
    }
    
    return savedCount;
  }

  async getChannelSchedulesByNameAndDate(
    channelName: string,
    date: string,
    areaSolicitante?: string,
    contexto?: 'form' | 'admin'
  ): Promise<{
    disponivelHoras: Array<{
      hora: string;
      available: string;
      totalUsado: string;
      maxValue: string;
      totalReservadoMesmaArea?: string;
    }>;
  }> {
    try {
  console.log(`ðŸ” Buscando disponibilidade - Canal: ${channelName}, Data: ${date}, Ãrea: ${areaSolicitante || 'NÃ£o informada'}, Contexto: ${contexto || 'admin'}`);

      // 1. Buscar board "Hora" no Monday
      const horaBoard = await this.mondayBoardRepository.findOne({
        where: { name: 'Hora' }
      });

      if (!horaBoard) {
        throw new Error('Board "Hora" nÃ£o encontrado no Monday');
      }

  console.log(`Board "Hora" encontrado: ${horaBoard.id}`);

      // 2. Buscar todos os items ativos do board "Hora"
      const horaItems = await this.mondayItemRepository.find({
        where: { 
          board_id: horaBoard.id,
          status: 'Ativo'
        },
        relations: ['board']
      });

  console.log(`Encontrados ${horaItems.length} itens de hora ativos`);

      // 3. Buscar item do canal especÃ­fico para obter max_value
      const canalItem = await this.mondayItemRepository.findOne({
        where: { 
          name: channelName,
          status: 'Ativo'
        }
      });

      if (!canalItem) {
  console.log(`Canal "${channelName}" nÃ£o encontrado ou inativo`);
        return { disponivelHoras: [] };
      }

      const maxValue = parseFloat(canalItem.max_value?.toString() || '0');
  console.log(`Max value para canal ${channelName}: ${maxValue}`);

      // 4. Converter string de data para Date object
      const parsedDate = this.parseDate(date);

      // 5. Buscar todos os schedules do canal na data especÃ­fica
      const channelSchedules = await this.channelScheduleRepository.find({
        where: { 
          id_canal: canalItem.item_id,
          data: parsedDate
        }
      });

  console.log(`ðŸ“… Encontrados ${channelSchedules.length} schedules para o canal ${channelName} na data ${date}`);

  // Debug: Mostrar detalhes dos schedules
  channelSchedules.forEach(schedule => {
    console.log(`  - ID: ${schedule.id}, Hora: ${schedule.hora}, Qtd: ${schedule.qtd}, Tipo: ${schedule.tipo || 'agendamento'}, Ãrea: ${schedule.area_solicitante || 'N/A'}`);
  });

  console.log(`ðŸŽ¯ ParÃ¢metros de consulta - Ãrea Solicitante: ${areaSolicitante || 'N/A'}, Contexto: ${contexto || 'admin'}`);

      // 6. Calcular disponibilidade consolidada por hora
      const disponivelHoras = this.calculateChannelAvailabilityPerHour(
        horaItems,
        channelSchedules,
        maxValue,
        areaSolicitante,
        contexto || 'admin'  // Se nÃ£o especificado, assume 'admin' (mais restritivo)
      );

      return {
        disponivelHoras
      };

    } catch (error) {
      console.error('âŒ Erro ao buscar disponibilidade por canal e data:', error);
      throw new Error(`Erro ao buscar disponibilidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private calculateChannelAvailabilityPerHour(
    horaItems: MondayItem[],
    channelSchedules: ChannelSchedule[],
    maxValue: number,
    areaSolicitante?: string,
    contexto: 'form' | 'admin' = 'admin'
  ): Array<{
    hora: string;
    available: string;
    totalUsado: string;
    maxValue: string;
    totalReservadoMesmaArea?: string;
  }> {

    const result: Array<{
      hora: string;
      available: string;
      totalUsado: string;
      maxValue: string;
      totalReservadoMesmaArea?: string;
    }> = [];

    // HorÃ¡rios especiais que compartilham limite (8:00 e 8:30)
    const splitHours = ["08:00", "08:30"];

    // Para cada item de hora ativo, calcular a disponibilidade
    horaItems.forEach(horaItem => {
      const hora = horaItem.name; // Assumindo que o name do item contÃ©m a hora (ex: "14:00")

      // Verificar se Ã© um dos horÃ¡rios especiais (8:00 ou 8:30)
      if (splitHours.includes(hora)) {
        // Limite dividido: cada horÃ¡rio tem metade do maxValue
        const splitMaxValue = maxValue / 2;

        // Buscar schedules especÃ­ficos deste horÃ¡rio
        const schedulesForThisHour = channelSchedules.filter(schedule => {
          const scheduleHour = schedule.hora.substring(0, 5);
          return scheduleHour === hora;
        });

        // LÃ“GICA ATUALIZADA: Considera contexto (form vs admin)
        // - Agendamentos (tipo = 'agendamento'): SEMPRE contam como usado
        // - Reservas (tipo = 'reserva'): 
        //   * contexto 'form': sÃ³ contam se forem de OUTRA Ã¡rea
        //   * contexto 'admin': SEMPRE contam (nÃ£o pode reservar duas vezes)
        
        let totalUsado = 0;
        let totalReservadoMesmaArea = 0;

        schedulesForThisHour.forEach(schedule => {
          const qtd = parseFloat(schedule.qtd.toString());
          const tipo = schedule.tipo || 'agendamento';
          
          if (tipo === 'agendamento') {
            // Agendamentos SEMPRE contam como usado
            totalUsado += qtd;
          } else if (tipo === 'reserva') {
            // Comportamento diferente por contexto
            if (contexto === 'form') {
              // FormulÃ¡rio: reservas da mesma Ã¡rea nÃ£o contam
              console.log(`      ðŸ“Œ Reserva - Qtd: ${qtd}, Ãrea da reserva: "${schedule.area_solicitante}", Ãrea solicitante: "${areaSolicitante}"`);
              if (areaSolicitante && schedule.area_solicitante === areaSolicitante) {
                // Ã‰ da mesma Ã¡rea - nÃ£o conta como usado
                console.log(`        âœ… MESMA ÃREA - NÃ£o conta como usado, pode reutilizar!`);
                totalReservadoMesmaArea += qtd;
              } else {
                // Ã‰ de outra Ã¡rea - conta como usado
                console.log(`        âŒ ÃREA DIFERENTE - Conta como usado!`);
                totalUsado += qtd;
              }
            } else {
              // Admin: TODAS as reservas contam (inclusive da mesma Ã¡rea)
              totalUsado += qtd;
              if (areaSolicitante && schedule.area_solicitante === areaSolicitante) {
                // Marca como reserva da mesma Ã¡rea (informativo)
                totalReservadoMesmaArea += qtd;
              }
            }
          }
        });

        // Debug para horÃ¡rios especiais
        if (schedulesForThisHour.length > 0) {
          console.log(`  ðŸ• Hora ${hora} (especial) - Contexto: ${contexto}:`);
          console.log(`    - Total de schedules: ${schedulesForThisHour.length}`);
          console.log(`    - Total usado (agendamentos + reservas${contexto === 'admin' ? ' todas' : ' outras Ã¡reas'}): ${totalUsado}`);
          if (areaSolicitante) {
            console.log(`    - Reservas da mesma Ã¡rea (${areaSolicitante}): ${totalReservadoMesmaArea}`);
          }
        }

        // Calcular disponÃ­vel considerando o limite dividido
        // Garante que nunca seja negativo (mÃ­nimo 0)
        const available = Math.max(0, splitMaxValue - totalUsado);

        const resultItem: any = {
          hora,
          available: available.toFixed(2),
          totalUsado: totalUsado.toFixed(2),
          maxValue: splitMaxValue.toFixed(2)
        };

        if (areaSolicitante && contexto === 'form') {
          resultItem.totalReservadoMesmaArea = totalReservadoMesmaArea.toFixed(2);
        }

        result.push(resultItem);
      } else {
        // HorÃ¡rios normais: comportamento padrÃ£o
        const schedulesForHour = channelSchedules.filter(schedule => {
          const scheduleHour = schedule.hora.substring(0, 5);
          return scheduleHour === hora;
        });

        // LÃ“GICA ATUALIZADA: Considera contexto (form vs admin)
        // - Agendamentos (tipo = 'agendamento'): SEMPRE contam como usado
        // - Reservas (tipo = 'reserva'): 
        //   * contexto 'form': sÃ³ contam se forem de OUTRA Ã¡rea
        //   * contexto 'admin': SEMPRE contam (nÃ£o pode reservar duas vezes)
        
        let totalUsado = 0;
        let totalReservadoMesmaArea = 0;

        schedulesForHour.forEach(schedule => {
          const qtd = parseFloat(schedule.qtd.toString());
          const tipo = schedule.tipo || 'agendamento';
          
          if (tipo === 'agendamento') {
            // Agendamentos SEMPRE contam como usado
            totalUsado += qtd;
          } else if (tipo === 'reserva') {
            // Comportamento diferente por contexto
            if (contexto === 'form') {
              // FormulÃ¡rio: reservas da mesma Ã¡rea nÃ£o contam
              console.log(`      ðŸ“Œ Reserva - Qtd: ${qtd}, Ãrea da reserva: "${schedule.area_solicitante}", Ãrea solicitante: "${areaSolicitante}"`);
              if (areaSolicitante && schedule.area_solicitante === areaSolicitante) {
                // Ã‰ da mesma Ã¡rea - nÃ£o conta como usado
                console.log(`        âœ… MESMA ÃREA - NÃ£o conta como usado, pode reutilizar!`);
                totalReservadoMesmaArea += qtd;
              } else {
                // Ã‰ de outra Ã¡rea - conta como usado
                console.log(`        âŒ ÃREA DIFERENTE - Conta como usado!`);
                totalUsado += qtd;
              }
            } else {
              // Admin: TODAS as reservas contam (inclusive da mesma Ã¡rea)
              totalUsado += qtd;
              if (areaSolicitante && schedule.area_solicitante === areaSolicitante) {
                // Marca como reserva da mesma Ã¡rea (informativo)
                totalReservadoMesmaArea += qtd;
              }
            }
          }
        });

        // Debug para horÃ¡rios normais
        if (schedulesForHour.length > 0) {
          console.log(`  ðŸ• Hora ${hora} - Contexto: ${contexto}:`);
          console.log(`    - Total de schedules: ${schedulesForHour.length}`);
          console.log(`    - Total usado (agendamentos + reservas${contexto === 'admin' ? ' todas' : ' outras Ã¡reas'}): ${totalUsado}`);
          if (areaSolicitante) {
            console.log(`    - Reservas da mesma Ã¡rea (${areaSolicitante}): ${totalReservadoMesmaArea}`);
          }
        }

        // DisponÃ­vel = Limite - Total usado
        // Garante que nunca seja negativo (mÃ­nimo 0)
        const available = Math.max(0, maxValue - totalUsado);

        const resultItem: any = {
          hora,
          available: available.toFixed(2),
          totalUsado: totalUsado.toFixed(2),
          maxValue: maxValue.toFixed(2)
        };

        if (areaSolicitante && contexto === 'form') {
          resultItem.totalReservadoMesmaArea = totalReservadoMesmaArea.toFixed(2);
        }

        result.push(resultItem);
      }
    });

    // Ordenar por hora
    result.sort((a, b) => a.hora.localeCompare(b.hora));

    return result;
  }

  private parseDate(dateString: string): Date {
    // Suporte para formatos DD/MM/YYYY e YYYY-MM-DD
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return new Date(Number(year), Number(month) - 1, Number(day));
    } else if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      throw new Error('Formato de data inválido. Use DD/MM/YYYY ou YYYY-MM-DD');
    }
  }

  async getFieldOptions(fieldId: string): Promise<any[]> {
    try {
      // Query GraphQL para buscar informaÃ§Ãµes do campo
      const query = `
        query {
          boards {
            columns(ids: ["${fieldId}"]) {
              id
              title
              type
              settings_str
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      const boardsData = response?.data?.boards;
      const boards = Array.isArray(boardsData) ? boardsData : [];

      // Encontra todas as colunas que correspondem ao fieldId
      const columns = boards
        .flatMap((board: any) => Array.isArray(board?.columns) ? board.columns : [])
        .filter((column: any) => column.id === fieldId);

      if (columns.length === 0) {
        throw new Error(`Campo ${fieldId} não encontrado`);
      }

      const column = columns[0];
      
      // Parse das configuraÃ§Ãµes da coluna
      let settings: any = {};
      try {
        settings = JSON.parse(column.settings_str || '{}');
      } catch (error) {
        console.warn('Erro ao analisar settings_str:', error);
        settings = {};
      }

      // Extrai as opÃ§Ãµes baseado no tipo de coluna
      return this.extractOptionsFromSettings(settings, column.type);
      
    } catch (error) {
      console.error('Erro ao buscar opÃ§Ãµes do campo:', error);
      throw error;
    }
  }

  private extractOptionsFromSettings(settings: any, columnType: string): any[] {    
    try {
      // Para campos dropdown/status
      if (settings.labels && typeof settings.labels === 'object') {
        return Object.entries(settings.labels).map(([id, label]: [string, any]) => {
          const resolvedLabel = typeof label === 'string' ? label : label?.name || label?.text || id;
          const colorInfo = settings.labels_colors?.[id] || settings.labels_colors?.[resolvedLabel];
          
          // If colorInfo is an object, keep it as is, otherwise create simple structure
          const resolvedColor = typeof colorInfo === 'object' && colorInfo !== null 
            ? colorInfo 
            : (typeof colorInfo === 'string' ? colorInfo : '#808080');

          return {
            id,
            name: resolvedLabel,
            label: resolvedLabel,
            color: resolvedColor
          };
        });
      }

      // Para campos de pessoas (people)
      if (columnType === 'people' && settings.personsAndTeams) {
        return settings.personsAndTeams.map((person: any) => ({
          id: person.id.toString(),
          name: person.name,
          color: person.photo_thumb ? '#4CAF50' : '#808080'
        }));
      }

      // Para outros tipos de campo com opÃ§Ãµes
      if (settings.options && Array.isArray(settings.options)) {
        return settings.options.map((option: any, index: number) => ({
          id: option.id || index.toString(),
          name: option.name || option.label || option.text || `OpÃ§Ã£o ${index + 1}`,
          color: option.color || '#808080'
        }));
      }

      // Para campos de board relation
      if (columnType === 'board-relation' && settings.boardIds) {
        // Retorna uma lista bÃ¡sica indicando que sÃ£o boards relacionados
        return settings.boardIds.map((boardId: string) => ({
          id: boardId,
          name: `Board ${boardId}`,
          color: '#2196F3'
        }));
      }

      // Se nÃ£o encontrou opÃ§Ãµes especÃ­ficas, retorna array vazio
      console.warn(`Tipo de campo '${columnType}' nÃ£o suportado ou sem opÃ§Ãµes configuradas`);
      return [];

    } catch (error) {
      console.error('Erro ao extrair opÃ§Ãµes das configuraÃ§Ãµes:', error);
      return [];
    }
  }

  // Removed unused createItem and updateItem methods

  /**
   * change_multiple_column_values com board_id explÃ­cito, Ãºtil para colunas de relaÃ§Ã£o
   */
  async changeMultipleColumnValues(boardId: string, itemId: string, columnValues: Record<string, any>): Promise<any> {
    try {
      const columnValuesStr = JSON.stringify(columnValues).replace(/"/g, '\\"');
      const mutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${itemId},
            board_id: ${boardId},
            column_values: "${columnValuesStr}"
          ) {
            id
          }
        }
      `;
      const response = await this.makeGraphQLRequest(mutation);
      return response.data?.change_multiple_column_values || null;
    } catch (error) {
      console.error('Error changing multiple column values:', error);
      throw error;
    }
  }

  /**
   * Faz upload de um arquivo para o Monday.com e retorna o ID do arquivo
   * @param filePath Caminho completo para o arquivo no sistema
   * @param itemId ID do item no Monday.com
   * @param columnId ID da coluna de arquivo
   * @returns ID do arquivo no Monday.com
   */
  public async uploadFile(filePath: string, itemId: string, columnId: string): Promise<string> {
    try {
      // Verificar se o arquivo existe
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }      // Obter informaÃ§Ãµes do arquivo
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      
      console.log(`Iniciando upload do arquivo: ${fileName} (${fileStats.size} bytes) para item ${itemId}, coluna ${columnId}`);

      // Preparar FormData para upload
      const formData = new FormData();
      
      // Query GraphQL para upload de arquivo
      const query = `
        mutation add_file_to_column($file: File!) {
          add_file_to_column(
            file: $file,
            item_id: ${itemId},
            column_id: "${columnId}"
          ) {
            id
            name
            url
          }
        }
      `;
      
      // Adicionar query e variÃ¡veis
      formData.append('query', query);
      
      // Adicionar variÃ¡veis (inicialmente null para o arquivo)
      const variables = JSON.stringify({ file: null });
      formData.append('variables', variables);
      
      // Adicionar mapeamento do arquivo
      const map = JSON.stringify({ 0: ['variables.file'] });
      formData.append('map', map);
      
      // Adicionar o arquivo
      const fileStream = fs.createReadStream(filePath);
      formData.append('0', fileStream, {
        filename: fileName,
        contentType: this.getMimeType(fileName)
      });

      // DEBUG: Imprimir detalhes da requisiÃ§Ã£o
      console.log('=== DEBUG UPLOAD FILE ===');
      console.log('Endpoint:', this.fileApiUrl);
      console.log('Query GraphQL:', query);
      console.log('Variables:', variables);
      console.log('Map:', map);
      console.log('Filename:', fileName);
      console.log('Content-Type:', this.getMimeType(fileName));
      console.log('Item ID:', itemId);
      console.log('Column ID:', columnId);
      console.log('File size:', fileStats.size, 'bytes');
      console.log('========================');

      // Fazer requisiÃ§Ã£o de upload
      const response = await axios.post(
        this.fileApiUrl,
        formData,
        {
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "API-Version": "2025-04",
            ...formData.getHeaders()
          }
        } as any
      );

      const data = response.data as any;
      console.log('=== RESPONSE DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('=====================');
      
      if (data.errors) {
        console.error("Erro no upload:", JSON.stringify(data.errors, null, 2));
        throw new Error(`Erro no upload: ${JSON.stringify(data.errors)}`);
      }

      const fileId = data.data?.add_file_to_column?.id;
      if (!fileId) {
        throw new Error("ID do arquivo nÃ£o retornado pela API");
      }

      console.log(`Upload concluÃ­do. ID do arquivo: ${fileId}`);
      return fileId;

    } catch (error: any) {
      console.error("Erro ao fazer upload do arquivo:", error);
      if (error.response) {
        console.log('=== ERROR RESPONSE DEBUG ===');
        console.log('Error status:', error.response.status);
        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        console.log('Error headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('============================');
      }
      throw new Error(`Falha no upload do arquivo: ${error.message}`);
    }
  }

  /**
   * @deprecated Use uploadFile diretamente, que jÃ¡ adiciona o arquivo na coluna especificada
   * MÃ©todo mantido para compatibilidade, mas nÃ£o Ã© mais necessÃ¡rio
   */
  public async updateFileColumn(itemId: string, _boardId: string, columnId: string, _fileId: string): Promise<any> {
    console.log(`updateFileColumn Ã© desnecessÃ¡rio - o arquivo jÃ¡ foi adicionado na coluna ${columnId} durante o upload`);
    return { id: itemId };
  }

  /**
   * Busca o cÃ³digo de subproduto associado a um produto especÃ­fico
   * @param productName Nome do produto para buscar subprodutos
   * @returns CÃ³digo do subproduto encontrado ou null se nÃ£o encontrar
   */
  async getSubproductCodeByProduct(productName: string): Promise<string | null> {
    try {
      // Buscar board de subprodutos
      const subproductBoard = await this.mondayBoardRepository.findOne({
        where: { name: 'Subproduto', is_active: true }
      });

      if (!subproductBoard) {
        console.warn('Board Subproduto nÃ£o encontrado');
        return null;
      }

      // Buscar subproduto que tenha o produto especificado na coluna product
      const subproduct = await this.mondayItemRepository.findOne({
        where: {
          board_id: subproductBoard.id,
          product: productName,
          status: 'Ativo'
        }
      });

      return subproduct?.code || null;
    } catch (error) {
      console.error('Erro ao buscar cÃ³digo de subproduto:', error);
      return null;
    }
  }

  /**
   * Busca o cÃ³digo de um item pelo nome no monday_items
   * @param name Nome do item para buscar
   * @param boardId ID do board para filtrar (opcional, evita colisÃµes)
   * @returns CÃ³digo do item ou undefined se nÃ£o encontrar
   */
  private async getCodeByItemName(name: string, boardId?: string): Promise<string | undefined> {
    const s = String(name || '').trim();
    if (!s) return undefined;
    try {
      const whereCondition: any = { name: s };
      if (boardId) {
        whereCondition.board_id = boardId;
      }
      const item = await this.mondayItemRepository.findOne({ where: whereCondition });
      return item?.code ?? undefined;
    } catch (e) {
      console.warn('Falha ao obter code por name em monday_items:', e);
      return undefined;
    }
  }

  /**
   * Busca os dados completos do subproduto associado a um produto especÃ­fico
   * @param productName Nome do produto para buscar subprodutos
   * @returns Objeto com name e code do subproduto ou null se nÃ£o encontrar
   */
  async getSubproductByProduct(productName: string): Promise<{ name: string; code: string } | null> {
    try {
      const normalizedProduct = (productName || '').trim();
      if (!normalizedProduct) {
        return null;
      }

      // Buscar board de subprodutos para obter o ID do board no Monday
      const subproductBoard = await this.mondayBoardRepository.findOne({
        where: { name: 'Subproduto', is_active: true }
      });

      if (!subproductBoard) {
        console.warn('Board Subproduto não encontrado');
        return null;
      }

      const boardMondayId = subproductBoard.board_id;
      if (!boardMondayId) {
        console.warn('Board Subproduto sem board_id configurado');
        return null;
      }

      const query = `
        query {
          boards(ids: [${boardMondayId}]) {
            items_page(limit: 200) {
              items {
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      const items = response?.data?.boards?.[0]?.items_page?.items;

      if (!Array.isArray(items) || items.length === 0) {
        return null;
      }

      const targetItem = items.find((item: any) =>
        typeof item?.name === 'string' && item.name.trim().toLowerCase() === normalizedProduct.toLowerCase()
      );

      if (!targetItem || !Array.isArray(targetItem.column_values)) {
        return null;
      }

      const extractCode = (columnValues: any[]): string | null => {
        for (const column of columnValues) {
          if (column?.text && typeof column.text === 'string' && column.text.trim().length > 0) {
            return column.text.trim();
          }

          if (column?.value) {
            try {
              const parsed = typeof column.value === 'string' ? JSON.parse(column.value) : column.value;
              const parsedText = parsed?.text || parsed?.value || parsed?.label;
              if (typeof parsedText === 'string' && parsedText.trim().length > 0) {
                return parsedText.trim();
              }
            } catch {
              if (typeof column.value === 'string' && column.value.trim().length > 0) {
                return column.value.trim();
              }
            }
          }
        }

        return null;
      };

      const code = extractCode(targetItem.column_values);
      if (!code) {
        return null;
      }

      return {
        name: targetItem.name,
        code
      };
    } catch (error) {
      console.error('Erro ao buscar dados de subproduto:', error);
      return null;
    }
  }

  /**
   * Determina o MIME type baseado na extensÃ£o do arquivo
   * @param fileName Nome do arquivo
   * @returns MIME type
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Busca campanhas do board principal com paginaÃ§Ã£o
   * @param cursor Cursor para paginaÃ§Ã£o (opcional)
   * @param dateFrom Data inicial para filtro (opcional, formato: YYYY-MM-DD ou DD/MM/YYYY)
   * @param dateTo Data final para filtro (opcional, formato: YYYY-MM-DD ou DD/MM/YYYY)
   * @returns Objeto com lista de campanhas e cursor para prÃ³xima pÃ¡gina
   */
  async getCampaignsPaginated(cursor?: string, dateFrom?: string, dateTo?: string, searchTerm?: string): Promise<{
    items: Array<{ id: string; name: string }>;
    campaigns: Array<{ id: string; name: string }>;
    cursor: string | null;
    hasMore: boolean;
  }> {
    try {
      console.log('[GET_CAMPAIGNS_PAGINATED] ==========================================');
      console.log('[GET_CAMPAIGNS_PAGINATED] Iniciando busca de campanhas');
      console.log('[GET_CAMPAIGNS_PAGINATED] ParÃ¢metros:', { cursor, dateFrom, dateTo, searchTerm });

      const MAIN_BOARD_ID = '7410140027';
      const LIMIT = 10; // 10 campanhas por pÃ¡gina para paginaÃ§Ã£o eficiente

      // Construir filtro de regras baseado nas datas e nome
      let rulesSection = '';
      if (dateFrom || dateTo || searchTerm) {
        const rules: string[] = [];

        // Filtro por nome da campanha
        if (searchTerm && searchTerm.trim() !== '') {
          const sanitizedTerm = searchTerm.replace(/"/g, '\\"');
          console.log('[GET_CAMPAIGNS_PAGINATED] Filtro de nome:', searchTerm);
          rules.push(`{column_id: "name", compare_value: ["${sanitizedTerm}"], operator: contains_text}`);
        }

        // Campo de data fim do board principal: date_mkrj355f (dataFim)
        // NOTA: data__1 existe em mÃºltiplos boards - nÃ£o usar para filtro global
        // Se houver data inicial (de)
        if (dateFrom) {
          const parsedDateFrom = this.formatDateForQuery(dateFrom);
          console.log('[GET_CAMPAIGNS_PAGINATED] Data FROM:', dateFrom, '-> Parsed:', parsedDateFrom);
          rules.push(`{column_id: "date_mkrj355f", compare_value: ["${parsedDateFrom}"], operator: greater_than_or_equals}`);
        }

        // Se houver data final (atÃ©)
        if (dateTo) {
          const parsedDateTo = this.formatDateForQuery(dateTo);
          console.log('[GET_CAMPAIGNS_PAGINATED] Data TO:', dateTo, '-> Parsed:', parsedDateTo);
          rules.push(`{column_id: "date_mkrj355f", compare_value: ["${parsedDateTo}"], operator: lower_than_or_equals}`);
        }

        if (rules.length > 0) {
          rulesSection = `, query_params: {rules: [${rules.join(', ')}], operator: and}`;
          console.log('[GET_CAMPAIGNS_PAGINATED] Rules section:', rulesSection);
        }
      }

      let query: string;

      if (cursor) {
        // Query para prÃ³xima pÃ¡gina usando cursor
        console.log('[GET_CAMPAIGNS_PAGINATED] Usando cursor para prÃ³xima pÃ¡gina:', cursor);
        query = `
          query {
            next_items_page(cursor: "${cursor}", limit: ${LIMIT}) {
              cursor
              items {
                id
                name
              }
            }
          }
        `;
      } else {
        // Query para primeira pÃ¡gina
        console.log('[GET_CAMPAIGNS_PAGINATED] Primeira pÃ¡gina - Board:', MAIN_BOARD_ID, 'Limit:', LIMIT);
        query = `
          query {
            boards(ids: [${MAIN_BOARD_ID}]) {
              items_page(limit: ${LIMIT}${rulesSection}) {
                cursor
                items {
                  id
                  name
                }
              }
            }
          }
        `;
      }

      console.log('[GET_CAMPAIGNS_PAGINATED] Query GraphQL:', query);
      console.log('[GET_CAMPAIGNS_PAGINATED] Enviando requisiÃ§Ã£o ao Monday...');

      const response = await this.makeGraphQLRequest(query);

      if (!response?.data) {
        console.warn('[GET_CAMPAIGNS_PAGINATED] Resposta vazia da API do Monday');
        return {
          items: [],
          campaigns: [],
          cursor: null,
          hasMore: false
        };
      }

      const responseData = response.data;

      console.log('[GET_CAMPAIGNS_PAGINATED] Resposta recebida do Monday');
      console.log('[GET_CAMPAIGNS_PAGINATED] Response data structure:', JSON.stringify(responseData, null, 2));

      let items: Array<{ id: string; name: string }>;
      let nextCursor: string | null;

      if (cursor) {
        // Resposta da prÃ³xima pÃ¡gina
        console.log('[GET_CAMPAIGNS_PAGINATED] Processando resposta de next_items_page');
        items = responseData?.next_items_page?.items || [];
        nextCursor = responseData?.next_items_page?.cursor || null;
        console.log('[GET_CAMPAIGNS_PAGINATED] Items encontrados:', items.length);
        console.log('[GET_CAMPAIGNS_PAGINATED] PrÃ³ximo cursor:', nextCursor);
      } else {
        // Resposta da primeira pÃ¡gina
        console.log('[GET_CAMPAIGNS_PAGINATED] Processando resposta de items_page');
        items = responseData?.boards?.[0]?.items_page?.items || [];
        nextCursor = responseData?.boards?.[0]?.items_page?.cursor || null;
        console.log('[GET_CAMPAIGNS_PAGINATED] Items encontrados:', items.length);
        console.log('[GET_CAMPAIGNS_PAGINATED] PrÃ³ximo cursor:', nextCursor);
      }

      console.log('[GET_CAMPAIGNS_PAGINATED] Retornando', items.length, 'campanhas');
      console.log('[GET_CAMPAIGNS_PAGINATED] ==========================================');

      const normalizedItems = items.map(item => ({
        id: item.id,
        name: item.name
      }));

      return {
        items: normalizedItems,
        campaigns: normalizedItems,
        cursor: nextCursor,
        hasMore: nextCursor !== null
      };
    } catch (error) {
      console.error('[GET_CAMPAIGNS_PAGINATED] âŒ ERRO:', error);
      console.error('[GET_CAMPAIGNS_PAGINATED] ==========================================');
      throw new Error(`Falha ao buscar campanhas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Formata data para query do Monday (formato YYYY-MM-DD)
   * @param dateString Data no formato YYYY-MM-DD ou DD/MM/YYYY
   * @returns Data formatada como YYYY-MM-DD
   */
  private formatDateForQuery(dateString: string): string {
    const pad = (value: string): string => value.padStart(2, '0');

    const isValidDay = (day: number): boolean => day >= 1 && day <= 31;
    const isValidMonth = (month: number): boolean => month >= 1 && month <= 12;

    const isoMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const monthNumber = Number(month);
      const dayNumber = Number(day);

      if (!isValidMonth(monthNumber) || !isValidDay(dayNumber)) {
        throw new Error('Formato de data inválido. Use YYYY-MM-DD ou DD/MM/YYYY');
      }

      return `${year}-${pad(month)}-${pad(day)}`;
    }

    const brMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      const monthNumber = Number(month);
      const dayNumber = Number(day);

      if (!isValidMonth(monthNumber) || !isValidDay(dayNumber)) {
        throw new Error('Formato de data inválido. Use YYYY-MM-DD ou DD/MM/YYYY');
      }

      return `${year}-${pad(month)}-${pad(day)}`;
    }

    throw new Error('Formato de data inválido. Use YYYY-MM-DD ou DD/MM/YYYY');
  }

  /**
   * Busca detalhes completos de uma campanha especÃ­fica
   * @param itemId ID do item da campanha no Monday
   * @returns Objeto com dados da campanha no formato do front (touchpoints em __SUBITEMS__, briefing separado)
   */
  async getCampaignDetails(itemId: string): Promise<any> {
    try {
      const MAIN_BOARD_ID = '7410140027';

      // Query para buscar o item principal com todas as colunas e seus subitems
      const query = `
        query {
          items(ids: [${itemId}]) {
            id
            name
            board {
              id
            }
            column_values {
              id
              text
              value
              column {
                id
                title
                type
              }
            }
            subitems {
              id
              name
              column_values {
                id
                text
                value
                column {
                  id
                  title
                  type
                }
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);

      if (!response?.data?.items || response.data.items.length === 0) {
        throw new Error('Campanha não encontrada');
      }

      const mainItem = response.data.items[0];      // Validar se o item pertence ao board principal (comparar como string)
      if (String(mainItem.board.id) !== String(MAIN_BOARD_ID)) {
        throw new Error('Item não pertence ao board principal de campanhas');
      }

      // Processar dados da campanha principal (sem subitems nativos do Monday)
      const campaign = this.processCampaignData(mainItem, false); // false = não incluir subitems

      // Buscar touchpoints e briefings EM PARALELO para melhor performance
      const [touchpointsRaw, briefingsRaw] = await Promise.all([
        this.getTouchpointsByCampaignId(itemId),
        this.getBriefingsByCampaignId(itemId)
      ]);

      const touchpoints = Array.isArray(touchpointsRaw) ? touchpointsRaw : [];
      const briefings = Array.isArray(briefingsRaw) ? briefingsRaw : [];

      // Montar resposta no formato que o front envia pro back:
      // - touchpoints vÃ£o dentro de __SUBITEMS__
      // - briefing vem separado (se existir)
      const result: any = {
        ...campaign
      };

      const normalizedTouchpoints = touchpoints.map((tp: any) => {
        const columns = tp?.columns && typeof tp.columns === 'object' ? tp.columns : {};
        return {
          id: tp?.id,
          name: tp?.name,
          descricao: tp?.descricao,
          ...columns,
        };
      });

      const mondaySubitems = Array.isArray(mainItem.subitems)
        ? mainItem.subitems.map((subitem: any) => {
            const columns = this.processColumnValues(subitem.column_values);
            const textoCol = Array.isArray(subitem.column_values)
              ? subitem.column_values.find((col: any) => col.id === 'texto__1')
              : undefined;
            const descricao = textoCol?.text || textoCol?.value || subitem.name;
            return {
              id: subitem.id,
              name: subitem.name,
              descricao,
              ...columns,
            };
          })
        : [];

      const combinedSubitems = normalizedTouchpoints.length > 0
        ? normalizedTouchpoints
        : mondaySubitems;

      result.__SUBITEMS__ = combinedSubitems;

      // Adicionar briefing se existir (apenas o primeiro, geralmente sÃ³ tem 1)
      if (briefings.length > 0) {
        // IMPORTANTE: NÃ£o incluir o campo 'demandante' do briefing
        // O demandante deve vir APENAS do item principal (data.demandante)
        const briefingColumns = { ...briefings[0].columns };
        delete briefingColumns.demandante; // Remove demandante do briefing para nÃ£o sobrescrever o da campanha principal

        result.briefing = {
          id: briefings[0].id,
          name: briefings[0].name,
          ...briefingColumns
        };
      }

      return result;
    } catch (error) {
      console.error('Erro ao buscar detalhes da campanha:', error);
      throw new Error(`Falha ao buscar detalhes da campanha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processa os dados da campanha principal
   * @param item Item do Monday a ser processado
   * @param includeSubitems Se deve incluir subitems nativos do Monday (padrÃ£o: true para compatibilidade)
   */
  private processCampaignData(item: any, includeSubitems: boolean = true): any {
    const campaignData: any = {
      id: item.id,
      name: item.name,
    };

    // Processar column_values em formato simplificado (apenas valores)
    if (item.column_values && Array.isArray(item.column_values)) {
      item.column_values.forEach((col: any) => {
        const columnId = col.id || col.column?.id;
        const columnType = col.column?.type;

        if (columnId && columnId !== 'name') {
          // Mapeamento dinÃ¢mico para pessoas5__1 baseado no board
          let backendName = this.COLUMN_ID_TO_BACKEND_NAME[columnId];

          // pessoas5__1 existe em mÃºltiplos boards - determinar pelo board_id do item
          if (columnId === 'pessoas5__1') {
            const itemBoardId = String(item.board?.id || '');
            if (itemBoardId === '7410140027') {
              backendName = 'demandante';  // Board principal
            } else if (itemBoardId === '7463706726') {
              backendName = 'demandanteDisparo';  // Board de touchpoints
            }
          }

          // FILTRO: sÃ³ processar campos que tÃªm mapeamento explÃ­cito
          if (!backendName) {
            return; // Descartar campos sem mapeamento
          }

          // Extrair apenas o valor simplificado
          const extractedValue = this.extractColumnValue(col, columnType);

          // Debug log para campo demandante
          if (columnId === 'pessoas5__1') {
            console.log(`[DEBUG] Campo demandante (pessoas5__1):`);
            console.log(`  - columnId: ${columnId}`);
            console.log(`  - itemBoardId: ${item.board?.id}`);
            console.log(`  - backendName: ${backendName}`);
            console.log(`  - columnType: ${columnType}`);
            console.log(`  - text: ${col.text}`);
            console.log(`  - value (raw):`, col.value);
            console.log(`  - extractedValue:`, extractedValue);
          }

          campaignData[backendName] = extractedValue;
        }
      });
    }

    // Adicionar subitems nativos do Monday apenas se solicitado
    // (getCampaignDetails nÃ£o inclui porque usa touchpoints do board secundÃ¡rio)
    if (includeSubitems && item.subitems && Array.isArray(item.subitems)) {
      campaignData.subitems = item.subitems.map((subitem: any) => ({
        id: subitem.id,
        name: subitem.name,
        columns: this.processColumnValues(subitem.column_values)
      }));
    }

    return campaignData;
  }

  /**
   * Processa column_values em formato simplificado (apenas valores)
   * Retorna no mesmo formato que o front envia para o back
   */
  private processColumnValues(columnValues: any[]): any {
    const processed: any = {};

    if (columnValues && Array.isArray(columnValues)) {
      columnValues.forEach((col: any) => {
        const columnId = col.id || col.column?.id;
        const columnType = col.column?.type;

        if (columnId) {
          // FILTRO: sÃ³ processar campos que tÃªm mapeamento explÃ­cito
          const backendName = this.COLUMN_ID_TO_BACKEND_NAME[columnId];

          if (!backendName) {
            return; // Descartar campos sem mapeamento
          }

          // Extrair apenas o valor de acordo com o tipo da coluna
          processed[backendName] = this.extractColumnValue(col, columnType);
        }
      });
    }

    return processed;
  }

  /**
   * Extrai o valor simplificado de uma coluna baseado no seu tipo
   */
  private extractColumnValue(col: any, columnType: string): any {
    const text = col.text;
    const value = col.value;

    // Se nÃ£o tem valor, retornar null
    if (!value && !text) {
      return null;
    }

    try {
      // Tipos que devem retornar o text diretamente
      if (['text', 'long_text', 'item_id'].includes(columnType)) {
        return text || null;
      }

      // Status - retornar o text (label do status)
      if (columnType === 'status') {
        return text || null;
      }

      // Date - retornar apenas a data (text tem formato YYYY-MM-DD)
      if (columnType === 'date') {
        if (value) {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          return parsed?.date || text || null;
        }
        return text || null;
      }

      // Numbers - retornar como nÃºmero
      if (columnType === 'numbers') {
        return text ? parseFloat(text) : null;
      }

      // People - retornar IDs separados por vÃ­rgula (formato que o front envia)
      // IMPORTANTE: Front envia IDs de subscribers e espera receber IDs de volta
      // para poder preencher o SubscriberDropdown corretamente
      if (columnType === 'people') {
        if (value) {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          // Retornar IDs como string "123,456" para manter simetria
          if (parsed?.personsAndTeams && Array.isArray(parsed.personsAndTeams)) {
            return parsed.personsAndTeams.map((p: any) => p.id).join(',');
          }
        }
        return null;
      }

      // Dropdown - retornar texto (label) selecionado (formato que o front envia)
      if (columnType === 'dropdown') {
        // Para manter simetria, retornar o text (label exibido)
        // Front envia "label" e espera receber "label" de volta
        return text || null;
      }

      // Board relation - retornar string com IDs separados por vÃ­rgula (formato que o front envia)
      if (columnType === 'board_relation' || columnType === 'board-relation') {
        // EXCEÃ‡ÃƒO: campo de horÃ¡rio (conectar_quadros_mkkcnyr3) deve retornar o texto ("09:00") nÃ£o o ID
        const columnId = col.id || col.column?.id;
        if (columnId === 'conectar_quadros_mkkcnyr3') {
          return text || null; // Retornar "09:00" ao invÃ©s do ID
        }
        
        if (value) {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          const linkedIds = parsed?.linkedPulseIds?.map((item: any) => item.linkedPulseId) || [];
          return linkedIds.length > 0 ? linkedIds.join(',') : null;
        }
        return null;
      }

      // File - retornar array de arquivos ou URLs
      if (columnType === 'file') {
        if (value) {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          return parsed?.files || parsed || null;
        }
        return text || null;
      }

      // Link - retornar URL
      if (columnType === 'link') {
        if (value) {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          return parsed?.url || text || null;
        }
        return text || null;
      }

      // Timeline - retornar objeto com from e to
      if (columnType === 'timeline') {
        if (value) {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          return parsed || null;
        }
        return null;
      }

      // Mirror/Lookup - retornar text (formato read-only, front envia como string)
      if (columnType === 'mirror' || columnType === 'lookup') {
        // Lookup/Mirror sÃ£o geralmente read-only e retornam text
        // Front envia string e espera receber string
        return text || null;
      }

      // Formula - retornar text
      if (columnType === 'formula') {
        return text || null;
      }

      // Default: retornar text se disponÃ­vel
      return text || value || null;

    } catch (error) {
      // Em caso de erro ao parsear, retornar text
      console.warn(`Erro ao processar coluna ${col.id}:`, error);
      return text || null;
    }
  }

  /**
   * Busca touchpoints relacionados Ã  campanha usando query OTIMIZADA
   * Usa a coluna link_to_itens_filhos__1 do board principal para buscar apenas touchpoints conectados
   */
  private async getTouchpointsByCampaignId(campaignId: string): Promise<any[]> {
    try {
      // Query OTIMIZADA: busca diretamente os touchpoints conectados via link_to_itens_filhos__1
      const query = `
        query {
          items(ids: [${campaignId}]) {
            id
            column_values(ids: ["link_to_itens_filhos__1"]) {
              ... on BoardRelationValue {
                linked_items {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                    column {
                      id
                      title
                      type
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);

      // Extrair touchpoints linkados via link_to_itens_filhos__1
      const columnValue = response.data?.items?.[0]?.column_values?.[0];
      console.log('DEBUG - Touchpoints column value (link_to_itens_filhos__1):', JSON.stringify(columnValue, null, 2));

      const linkedItems = columnValue?.linked_items || [];
      console.log(`DEBUG - Touchpoints encontrados via query otimizada: ${linkedItems.length}`);

      // Se a query otimizada nÃ£o retornou resultados, tentar fallback
      if (linkedItems.length === 0) {
        console.log('Query otimizada nÃ£o retornou touchpoints, tentando fallback...');
        return this.getTouchpointsByFallbackMethod(campaignId);
      }

      // Processar touchpoints
      return linkedItems.map((item: any) => {
        const columns = this.processColumnValues(item.column_values);
        // Buscar descriÃ§Ã£o no campo texto__1
        const textoCol = item.column_values?.find((col: any) => col.id === 'texto__1');
        const descricao = textoCol?.text || textoCol?.value || item.name;
        
        return {
          id: item.id,
          name: item.name,
          descricao: descricao, // Adicionar descriÃ§Ã£o explicitamente
          columns: columns
        };
      });
    } catch (error) {
      console.error('Erro ao buscar touchpoints (tentando mÃ©todo alternativo):', error);
      return this.getTouchpointsByFallbackMethod(campaignId);
    }
  }

  /**
   * MÃ©todo fallback para buscar touchpoints (caso a query otimizada falhe)
   */
  public async getTouchpointsByFallbackMethod(campaignId: string): Promise<any[]> {
    try {
      const SECOND_BOARD_ID = '7463706726';

      // Buscar todos os touchpoints do board secundÃ¡rio
      const query = `
        query {
          boards(ids: [${SECOND_BOARD_ID}]) {
            items_page(limit: 200) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                  column {
                    id
                    title
                    type
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      const allItems = response.data?.boards?.[0]?.items_page?.items || [];
      console.log(`DEBUG - Total de touchpoints no board secundÃ¡rio (fallback): ${allItems.length}`);

      // Filtrar itens que tÃªm relaÃ§Ã£o com a campanha via conectar_quadros8__1
      const relatedTouchpoints = allItems.filter((item: any) => {
        const connectColumn = item.column_values?.find((col: any) => col.id === 'conectar_quadros8__1');
        if (connectColumn && connectColumn.value) {
          try {
            const parsedValue = typeof connectColumn.value === 'string'
              ? JSON.parse(connectColumn.value)
              : connectColumn.value;
            const linkedItemIds = parsedValue?.linkedPulseIds || [];
            return linkedItemIds.some((id: any) => String(id.linkedPulseId) === String(campaignId));
          } catch {
            return false;
          }
        }
        return false;
      });

      console.log(`DEBUG - Touchpoints relacionados Ã  campanha ${campaignId} (fallback): ${relatedTouchpoints.length}`);

      return relatedTouchpoints.map((item: any) => {
        const columns = this.processColumnValues(item.column_values);
        // Buscar descriÃ§Ã£o no campo texto__1
        const textoCol = item.column_values?.find((col: any) => col.id === 'texto__1');
        const descricao = textoCol?.text || textoCol?.value || item.name;
        
        return {
          id: item.id,
          name: item.name,
          descricao: descricao, // Adicionar descriÃ§Ã£o explicitamente
          columns: columns
        };
      });
    } catch (error) {
      console.error('Erro no fallback de touchpoints:', error);
      return [];
    }
  }

  /**
   * Busca briefings relacionados Ã  campanha usando query otimizada
   * Usa a busca reversa pela coluna conectar_quadros20__1 para buscar apenas itens relacionados
   */
  private async getBriefingsByCampaignId(campaignId: string): Promise<any[]> {
    try {
      // Query otimizada: busca diretamente pela coluna conectar_quadros20__1 no item da campanha
      // Isso retorna apenas os briefings conectados, sem precisar buscar todos os 500
      const query = `
        query {
          items(ids: [${campaignId}]) {
            id
            column_values(ids: ["conectar_quadros20__1"]) {
              ... on BoardRelationValue {
                linked_items {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                    column {
                      id
                      title
                      type
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);

      // Extrair itens linkados (briefings conectados)
      const columnValue = response.data?.items?.[0]?.column_values?.[0];
      console.log('DEBUG - Briefing column value (conectar_quadros20__1):', JSON.stringify(columnValue, null, 2));

      const linkedItems = columnValue?.linked_items || [];
      console.log(`DEBUG - Briefings encontrados via query otimizada: ${linkedItems.length}`);

      // Se a query otimizada nÃ£o retornou resultados, tentar fallback
      if (linkedItems.length === 0) {
        console.log('Query otimizada nÃ£o retornou briefings, tentando fallback...');
        return this.getBriefingsByFallbackMethod(campaignId);
      }

      // Processar briefings
      return linkedItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        columns: this.processColumnValues(item.column_values)
      }));
    } catch (error) {
      console.error('Erro ao buscar briefings (tentando mÃ©todo alternativo):', error);

      // Fallback: mÃ©todo antigo caso a query otimizada falhe
      return this.getBriefingsByFallbackMethod(campaignId);
    }
  }

  /**
   * MÃ©todo fallback para buscar briefings (caso a query otimizada falhe)
   */
  public async getBriefingsByFallbackMethod(campaignId: string): Promise<any[]> {
    try {
      const MARKETING_BOARD_ID = '9169887721';

      // Tentar buscar com limit menor para performance
      const query = `
        query {
          boards(ids: [${MARKETING_BOARD_ID}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                  column {
                    id
                    title
                    type
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      const allItems = response.data?.boards?.[0]?.items_page?.items || [];
      console.log(`DEBUG - Total de briefings no board: ${allItems.length}`);

      // Filtrar briefings relacionados Ã  campanha
      const relatedBriefings = allItems.filter((item: any) => {
        const relationColumns = item.column_values?.filter((col: any) =>
          col.column?.type === 'board-relation' || col.column?.type === 'board_relation'
        );

        return relationColumns?.some((col: any) => {
          if (col.value) {
            try {
              const parsedValue = typeof col.value === 'string'
                ? JSON.parse(col.value)
                : col.value;
              const linkedItemIds = parsedValue?.linkedPulseIds || [];
              return linkedItemIds.some((id: any) => String(id.linkedPulseId) === String(campaignId));
            } catch {
              return false;
            }
          }
          return false;
        });
      });

      console.log(`DEBUG - Briefings relacionados Ã  campanha ${campaignId}: ${relatedBriefings.length}`);

      return relatedBriefings.map((item: any) => ({
        id: item.id,
        name: item.name,
        columns: this.processColumnValues(item.column_values)
      }));
    } catch (error) {
      console.error('Erro no fallback de briefings:', error);
      return [];
    }
  }

  /**
   * Atualiza o nome de uma campanha se houver mudanÃ§a
   */
  public async updateCampaignNameIfChanged(campaignId: string, newName: string, currentName: string): Promise<boolean> {
    if (newName && newName !== currentName) {
      console.log(`[UPDATE] Nome do item serÃ¡ atualizado: "${currentName}" â†’ "${newName}"`);
      try {
        await this.updateItemName(campaignId, newName);
        console.log(`[UPDATE] âœ… Nome atualizado com sucesso`);
        return true;
      } catch (error) {
        console.error(`[UPDATE] âŒ Erro ao atualizar nome:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Coleta as atualizaÃ§Ãµes necessÃ¡rias comparando dados atuais vs novos
   */
  public collectCampaignFieldUpdates(formData: any, currentData: any): Array<{columnId: string, value: any}> {
    const updatesToMake: Array<{columnId: string, value: any}> = [];
    
    const FORM_FIELD_TO_COLUMN_ID: { [key: string]: string } = {};
    Object.entries(this.COLUMN_ID_TO_BACKEND_NAME).forEach(([columnId, backendName]) => {
      FORM_FIELD_TO_COLUMN_ID[backendName] = columnId;
    });

    const FRONTEND_CUSTOM_TO_MONDAY_COLUMN: { [key: string]: string } = {
      'text_outro_tipo_gam': 'text_mkrmjbhf',
      'texto_curto_links_validacao': 'long_text_mkrd6mnt',
    };

    Object.keys(formData).forEach((formFieldKey) => {
      if (formFieldKey === '__SUBITEMS__' || formFieldKey === 'briefing' || formFieldKey === 'action' || formFieldKey === 'name') {
        return;
      }

      const newValue = formData[formFieldKey];
      let actualFieldKey = formFieldKey;
      
      if (FRONTEND_CUSTOM_TO_MONDAY_COLUMN[formFieldKey]) {
        actualFieldKey = FRONTEND_CUSTOM_TO_MONDAY_COLUMN[formFieldKey];
        console.log(`[UPDATE] ðŸ”„ Convertendo campo customizado: ${formFieldKey} â†’ ${actualFieldKey}`);
      }

      let columnId: string | null = null;
      let backendFieldName: string | null = null;

      if (this.COLUMN_ID_TO_BACKEND_NAME[actualFieldKey]) {
        columnId = actualFieldKey;
        backendFieldName = this.COLUMN_ID_TO_BACKEND_NAME[actualFieldKey];
      } else {
        columnId = FORM_FIELD_TO_COLUMN_ID[actualFieldKey];
        backendFieldName = actualFieldKey;
      }

      if (!columnId || !backendFieldName) {
        console.log(`[UPDATE] Campo ${formFieldKey} nÃ£o tem mapeamento, ignorando`);
        return;
      }

      if (columnId.startsWith('lookup_')) {
        console.log(`[UPDATE] Campo ${formFieldKey} (${columnId}) Ã© lookup/mirror (read-only), ignorando`);
        return;
      }

      const fieldBoardId = this.COLUMN_TO_BOARD[columnId];
      if (fieldBoardId && fieldBoardId !== '7410140027') {
        console.log(`[UPDATE] âš ï¸  Campo ${formFieldKey} (${columnId}) pertence ao board ${fieldBoardId}, serÃ¡ IGNORADO`);
        return;
      }

      const currentValue = currentData[backendFieldName];
      const currentValueStr = this.normalizeValueForComparison(currentValue);
      const newValueStr = this.normalizeValueForComparison(newValue);

      if (currentValueStr !== newValueStr) {
        console.log(`[UPDATE] Campo ${backendFieldName} (${columnId}) modificado:`);
        console.log(`  Atual: ${currentValueStr}`);
        console.log(`  Novo: ${newValueStr}`);
        updatesToMake.push({ columnId, value: newValue });
      }
    });

    return updatesToMake;
  }

  /**
   * Aplica as atualizaÃ§Ãµes de campos da campanha principal
   * @private
   */
  private async applyCampaignFieldUpdates(campaignId: string, updates: Array<{columnId: string, value: any}>): Promise<number> {
    let updatedCount = 0;
    console.log(`[UPDATE] Total de campos a atualizar: ${updates.length}`);
    
    for (const update of updates) {
      try {
        await this.updateColumn(campaignId, update.columnId, update.value);
        updatedCount++;
        console.log(`[UPDATE] âœ… Campo ${update.columnId} atualizado com sucesso`);
      } catch (error) {
        console.error(`[UPDATE] âŒ Erro ao atualizar campo ${update.columnId}:`, error);
      }
    }
    
    console.log(`[UPDATE] Campanha principal: ${updatedCount}/${updates.length} campos atualizados`);
    return updatedCount;
  }

  /**
   * Atualiza o briefing da campanha se fornecido
   * @private
   */
  private async updateCampaignBriefing(briefingData: any, currentBriefing: any): Promise<number> {
    let briefingUpdated = 0;

    if (!briefingData || typeof briefingData !== 'object') {
      return 0;
    }

    console.log(`[UPDATE] ========================================`);
    console.log(`[UPDATE] Processando briefing...`);

    if (!briefingData.id) {
      console.log(`[UPDATE] âš ï¸  Briefing sem ID, ignorando`);
      return 0;
    }

    console.log(`[UPDATE] Atualizando briefing ${briefingData.id}`);

    if (!currentBriefing) {
      console.log(`[UPDATE] âš ï¸  Briefing nÃ£o encontrado nos dados atuais, ignorando`);
      return 0;
    }

    // Mapeamento adicional para campos do briefing no board de marketing
    const BRIEFING_CUSTOM_TO_MONDAY_COLUMN: { [key: string]: string } = {
      'texto_curto_links_validacao': 'long_text_mkrdqn35',
      'data__1': 'data64',
    };

    // Criar mapeamento inverso
    const FORM_FIELD_TO_COLUMN_ID: { [key: string]: string } = {};
    Object.entries(this.COLUMN_ID_TO_BACKEND_NAME).forEach(([columnId, backendName]) => {
      FORM_FIELD_TO_COLUMN_ID[backendName] = columnId;
    });

    const briefingUpdates: Array<{columnId: string, value: any}> = [];

    Object.keys(briefingData).forEach((fieldKey) => {
      if (fieldKey === 'id' || fieldKey === 'name') {
        return;
      }

      const newValue = briefingData[fieldKey];

      let actualFieldKey = fieldKey;
      if (BRIEFING_CUSTOM_TO_MONDAY_COLUMN[fieldKey]) {
        actualFieldKey = BRIEFING_CUSTOM_TO_MONDAY_COLUMN[fieldKey];
        console.log(`[UPDATE] ðŸ”„ Convertendo campo customizado do briefing: ${fieldKey} â†’ ${actualFieldKey}`);
      }

      let columnId: string | null = null;
      let backendFieldName: string | null = null;

      if (this.COLUMN_ID_TO_BACKEND_NAME[actualFieldKey]) {
        columnId = actualFieldKey;
        backendFieldName = this.COLUMN_ID_TO_BACKEND_NAME[actualFieldKey];
      } else {
        columnId = FORM_FIELD_TO_COLUMN_ID[actualFieldKey];
        backendFieldName = actualFieldKey;
      }

      if (!columnId || !backendFieldName) {
        return;
      }

      const currentValue = currentBriefing[backendFieldName];
      const currentValueStr = this.normalizeValueForComparison(currentValue);
      const newValueStr = this.normalizeValueForComparison(newValue);

      if (currentValueStr !== newValueStr) {
        console.log(`[UPDATE]   Campo ${backendFieldName} (${columnId}) modificado: "${currentValueStr}" â†’ "${newValueStr}"`);
        briefingUpdates.push({ columnId, value: newValue });
      }
    });

    // Executar updates do briefing
    for (const update of briefingUpdates) {
      try {
        await this.updateColumn(briefingData.id, update.columnId, update.value);
        briefingUpdated++;
        console.log(`[UPDATE]   âœ… Campo ${update.columnId} atualizado`);
      } catch (error) {
        console.error(`[UPDATE]   âŒ Erro ao atualizar campo ${update.columnId}:`, error);
      }
    }

    console.log(`[UPDATE] Briefing: ${briefingUpdated} campos atualizados`);
    return briefingUpdated;
  }

  /**
   * Recalcula campos taxonÃ´micos de um touchpoint
   * Atualiza referÃªncias, cÃ³digos e taxonomia composta
   * 
   * @param touchpointId ID do touchpoint no Monday
   * @param campaignId ID da campanha principal
   * @param touchpointData Dados atuais do touchpoint (canal, data, ordem)
   * @param campaignData Dados taxonÃ´micos da campanha (tipo cliente, campanha, etc)
   * @returns NÃºmero de campos taxonÃ´micos atualizados
   */
  private async recalculateTouchpointTaxonomy(
    touchpointId: string,
    campaignId: string,
    touchpointData: { canal: string; dataDisparo: string; ordemCanal: number },
    campaignData: {
      tipoCliente?: string;
      tipoCampanha?: string;
      tipoDisparo?: string;
      mecanica?: string;
      areaSolicitante?: string;
      objetivo?: string;
      produto?: string;
      segmento?: string;
    }
  ): Promise<number> {
    console.log(`[TAXONOMY] Recalculando campos taxonÃ´micos do touchpoint ${touchpointId}...`);

    try {
      // Buscar board_id do board "Produto" para evitar colisÃ£o
      const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
      const produtoBoardId = produtoBoard?.id;

      const taxonomyUpdates: Record<string, any> = {};

      // Cliente (ReferÃªncia + CÃ³digo)
      if (campaignData.tipoCliente) {
        taxonomyUpdates['text_mkrrg2hp'] = campaignData.tipoCliente;
        const clienteCode = await this.getCodeByItemName(campaignData.tipoCliente);
        taxonomyUpdates['text_mkrrna7e'] = clienteCode || 'NaN';
      }

      // Campanha (ReferÃªncia + CÃ³digo)
      if (campaignData.tipoCampanha) {
        taxonomyUpdates['text_mkrra7df'] = campaignData.tipoCampanha;
        const campanhaCode = await this.getCodeByItemName(campaignData.tipoCampanha);
        taxonomyUpdates['text_mkrrcnpx'] = campanhaCode || 'NaN';
      }

      // Disparo (ReferÃªncia + CÃ³digo)
      if (campaignData.tipoDisparo) {
        taxonomyUpdates['text_mkrr9edr'] = campaignData.tipoDisparo;
        const disparoCode = await this.getCodeByItemName(campaignData.tipoDisparo);
        taxonomyUpdates['text_mkrrmjcy'] = disparoCode || 'NaN';
      }

      // MecÃ¢nica (ReferÃªncia + CÃ³digo)
      if (campaignData.mecanica) {
        taxonomyUpdates['text_mkrrxf48'] = campaignData.mecanica;
        const mecanicaCode = await this.getCodeByItemName(campaignData.mecanica);
        taxonomyUpdates['text_mkrrxpjd'] = mecanicaCode || 'NaN';
      }

      // Ãrea Solicitante (ReferÃªncia + CÃ³digo)
      if (campaignData.areaSolicitante) {
        let areaSolicitanteValue = campaignData.areaSolicitante;
        if (/^\d+$/.test(areaSolicitanteValue)) {
          const item = await this.mondayItemRepository.findOne({ where: { item_id: areaSolicitanteValue } });
          if (item) {
            areaSolicitanteValue = item.name || areaSolicitanteValue;
            taxonomyUpdates['text_mkrrmmvv'] = item.code || 'NaN';
          } else {
            taxonomyUpdates['text_mkrrmmvv'] = 'NaN';
          }
        } else {
          const areaCode = await this.getCodeByItemName(areaSolicitanteValue);
          taxonomyUpdates['text_mkrrmmvv'] = areaCode || 'NaN';
        }
        taxonomyUpdates['text_mkrrxqng'] = areaSolicitanteValue;
      }

      // Objetivo (ReferÃªncia + CÃ³digo)
      if (campaignData.objetivo) {
        taxonomyUpdates['text_mkrrhdh6'] = campaignData.objetivo;
        const objetivoCode = await this.getCodeByItemName(campaignData.objetivo);
        taxonomyUpdates['text_mkrrraz2'] = objetivoCode || 'NaN';
      }

      // Produto (ReferÃªncia + CÃ³digo)
      if (campaignData.produto) {
        taxonomyUpdates['text_mkrrfqft'] = campaignData.produto;
        const produtoCode = await this.getCodeByItemName(campaignData.produto, produtoBoardId);
        taxonomyUpdates['text_mkrrjrnw'] = produtoCode || 'NaN';

        // Subproduto (ReferÃªncia + CÃ³digo)
        const subproductData = await this.getSubproductByProduct(campaignData.produto);
        if (subproductData) {
          taxonomyUpdates['text_mkw8et4w'] = subproductData.name;
          taxonomyUpdates['text_mkw8jfw0'] = subproductData.code;
        } else {
          taxonomyUpdates['text_mkw8et4w'] = '';
          taxonomyUpdates['text_mkw8jfw0'] = '';
        }
      }

      // Segmento (ReferÃªncia + CÃ³digo)
      if (campaignData.segmento) {
        taxonomyUpdates['text_mkrrt32q'] = campaignData.segmento;
        const segmentoCode = await this.getCodeByItemName(campaignData.segmento);
        taxonomyUpdates['text_mkrrhdf8'] = segmentoCode || 'NaN';
      }

      // Canal (ReferÃªncia + CÃ³digo)
      if (touchpointData.canal) {
        taxonomyUpdates['text_mkrrqsk6'] = touchpointData.canal;
        const canalCode = await this.getCodeByItemName(touchpointData.canal);
        taxonomyUpdates['text_mkrr8dta'] = canalCode || 'Email';
      }

      // Campos compostos de taxonomia (text_mkr5kh2r e text_mkr3jr1s)
      const taxonomyParts = [
        touchpointData.dataDisparo ? String(touchpointData.dataDisparo).replace(/-/g, '') : '',
        `id-${campaignId}`,
        taxonomyUpdates['text_mkrrna7e'] || '',
        taxonomyUpdates['text_mkrrcnpx'] || '',
        taxonomyUpdates['text_mkrrmjcy'] || '',
        taxonomyUpdates['text_mkrrxpjd'] || '',
        taxonomyUpdates['text_mkrrmmvv'] || '',
        taxonomyUpdates['text_mkrrraz2'] || '',
        taxonomyUpdates['text_mkrrjrnw'] || '',
        taxonomyUpdates['text_mkrrhdf8'] || ''
      ].filter(p => p !== '').join('-');

      const compositeTaxonomy = `${taxonomyParts}-${touchpointData.ordemCanal}-${touchpointData.canal}`;
      taxonomyUpdates['text_mkr5kh2r'] = compositeTaxonomy;
      taxonomyUpdates['text_mkr3jr1s'] = compositeTaxonomy;

      console.log(`[TAXONOMY] Taxonomia composta: ${compositeTaxonomy}`);

      // Atualizar data de atualizaÃ§Ã£o
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      taxonomyUpdates['date_mkrk5v4c'] = { date: `${yyyy}-${mm}-${dd}` };

      // Enviar todas as atualizaÃ§Ãµes taxonÃ´micas
      const SECOND_BOARD_ID = '7463706726';
      let updatedCount = 0;

      for (const [fieldId, value] of Object.entries(taxonomyUpdates)) {
        try {
          await this.updateColumn(touchpointId, fieldId, value, SECOND_BOARD_ID);
          updatedCount++;
        } catch (error) {
          console.error(`[TAXONOMY] Erro ao atualizar campo ${fieldId}:`, error);
        }
      }

      console.log(`[TAXONOMY] âœ… ${updatedCount} campos taxonÃ´micos atualizados`);
      return updatedCount;
    } catch (error) {
      console.error(`[TAXONOMY] Erro ao recalcular taxonomia:`, error);
      return 0;
    }
  }

  /**
   * Atualiza campos de um touchpoint existente
   * Compara valores atuais vs novos e aplica mudanÃ§as
   * TambÃ©m gerencia agendamentos (channel schedules) quando canal/data/hora mudam
   * 
   * @param touchpointId ID do touchpoint no Monday
   * @param touchpointData Dados novos do touchpoint (do frontend)
   * @param currentTouchpoint Dados atuais do touchpoint (do Monday)
   * @param campaignId ID da campanha principal
   * @param formData Dados completos do formulÃ¡rio (para contexto)
   * @param currentData Dados atuais da campanha (para contexto)
   * @returns { fieldsUpdated, taxonomyUpdated } - Contadores de campos atualizados
   */
  private async updateTouchpointFields(
    touchpointId: string,
    touchpointData: any,
    currentTouchpoint: any,
    campaignId: string,
    formData: any,
    currentData: any
  ): Promise<{ fieldsUpdated: number; taxonomyUpdated: number }> {
    console.log(`[UPDATE_TP] Atualizando touchpoint ${touchpointId}...`);

    let fieldsUpdated = 0;
    let taxonomyUpdated = 0;

    // Mapeamento especÃ­fico para campos de touchpoints (frontend â†’ Monday column)
    const TOUCHPOINT_FIELD_TO_COLUMN: { [key: string]: string } = {
      'canal': 'texto6__1',
      'dataDisparo': 'data__1',
      'ordemCanal': 'n_meros__1',
      'descricao': 'texto__1',
      'beneficio': 'lista_suspensa5__1',
      'gatilho': 'lista_suspensa53__1',
      'horaDisparo': 'text_mkvgjh0w',
      'volumeDisparo': 'n_meros_mkkchcmk',
    };

    const FORM_FIELD_TO_COLUMN_ID: { [key: string]: string } = {};
    Object.entries(this.COLUMN_ID_TO_BACKEND_NAME).forEach(([columnId, backendName]) => {
      FORM_FIELD_TO_COLUMN_ID[backendName] = columnId;
    });

    // Coletar mudanÃ§as de campos
    const touchpointUpdates: Array<{ columnId: string; value: any }> = [];

    Object.keys(touchpointData).forEach((fieldKey) => {
      if (fieldKey === 'id' || fieldKey === 'name') {
        return;
      }

      const newValue = touchpointData[fieldKey];

      let columnId: string | null = null;
      let backendFieldName: string | null = null;

      if (this.COLUMN_ID_TO_BACKEND_NAME[fieldKey]) {
        columnId = fieldKey;
        backendFieldName = this.COLUMN_ID_TO_BACKEND_NAME[fieldKey];
      } else if (TOUCHPOINT_FIELD_TO_COLUMN[fieldKey]) {
        columnId = TOUCHPOINT_FIELD_TO_COLUMN[fieldKey];
        backendFieldName = fieldKey;
      } else {
        columnId = FORM_FIELD_TO_COLUMN_ID[fieldKey];
        backendFieldName = fieldKey;
      }

      if (!columnId || !backendFieldName) {
        return;
      }

      const currentValue = currentTouchpoint[backendFieldName];
      const currentValueStr = this.normalizeValueForComparison(currentValue);
      const newValueStr = this.normalizeValueForComparison(newValue);

      if (currentValueStr !== newValueStr) {
        console.log(`[UPDATE_TP]   ${backendFieldName} (${columnId}): "${currentValueStr}" â†’ "${newValueStr}"`);
        touchpointUpdates.push({ columnId, value: newValue });
      }
    });

    // Verificar mudanÃ§as que afetam agendamento
    const horaChanged = touchpointUpdates.some(u => u.columnId === 'text_mkvgjh0w');
    const dataChanged = touchpointUpdates.some(u => u.columnId === 'data__1');
    const canalChanged = touchpointUpdates.some(u => u.columnId === 'texto6__1');

    let scheduleUpdateInfo: any = null;

    if (horaChanged || dataChanged || canalChanged) {
      console.log(`[UPDATE_TP] ðŸ”„ MudanÃ§a em canal/data/hora detectada`);

      // Buscar valores originais via API do Monday
      let oldHoraFromAPI = '';
      let oldCanalFromAPI = '';
      let oldDataFromAPI = '';

      try {
        const query = `
          query {
            items(ids: [${touchpointId}]) {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        `;

        const apiResponse = await this.makeGraphQLRequest(query);

        if (apiResponse?.data?.items?.[0]?.column_values) {
          const columns = apiResponse.data.items[0].column_values;

          const horaTextCol = columns.find((c: any) => c.id === 'text_mkvgjh0w');
          oldHoraFromAPI = horaTextCol?.text || horaTextCol?.value || '';

          if (!oldHoraFromAPI) {
            const horaRelationCol = columns.find((c: any) => c.id === 'conectar_quadros_mkkcnyr3');
            oldHoraFromAPI = horaRelationCol?.text || '';
          }

          const dataCol = columns.find((c: any) => c.id === 'data__1');
          if (dataCol?.value) {
            try {
              const dateObj = JSON.parse(dataCol.value);
              oldDataFromAPI = dateObj.date || '';
            } catch {
              oldDataFromAPI = dataCol.text || '';
            }
          }

          const canalTextCol = columns.find((c: any) => c.id === 'texto6__1');
          oldCanalFromAPI = canalTextCol?.text || canalTextCol?.value || '';

          if (!oldCanalFromAPI) {
            const canalRelationCol = columns.find((c: any) => c.id === 'conectar_quadros87__1');
            oldCanalFromAPI = canalRelationCol?.text || '';
          }

          console.log(`[UPDATE_TP]   Valores API: hora="${oldHoraFromAPI}", data="${oldDataFromAPI}", canal="${oldCanalFromAPI}"`);
        }
      } catch (apiError) {
        console.error(`[UPDATE_TP]   âš ï¸ Erro ao buscar via API, usando fallback:`, apiError);
        oldHoraFromAPI = currentTouchpoint['text_mkvgjh0w'] || currentTouchpoint.horario || '';
        oldCanalFromAPI = currentTouchpoint.canal || currentTouchpoint.nomeCanal || '';
        oldDataFromAPI = currentTouchpoint.dataDisparo || currentTouchpoint.data || '';
      }

      const newCanal = touchpointData.canal || '';
      const newData = touchpointData.dataDisparo || touchpointData.data__1 || '';
      const newHora = touchpointData.horaDisparo || '';
      const volumeDisparo = touchpointData.volumeDisparo || currentTouchpoint.volumeDemanda || 1000000;
      const areaSolicitante = formData.areaSolicitanteRelation || currentData.areaSolicitante || '';

      const temValorAntigo = (oldHoraFromAPI && oldDataFromAPI) || oldCanalFromAPI;
      const houveAlteracao = (oldHoraFromAPI !== newHora) || (oldDataFromAPI !== newData) || (oldCanalFromAPI !== newCanal);

      scheduleUpdateInfo = {
        touchpointId,
        oldCanal: oldCanalFromAPI,
        oldData: oldDataFromAPI,
        oldHora: oldHoraFromAPI,
        newCanal,
        newData,
        newHora,
        volumeDisparo,
        areaSolicitante,
        isPrimeiroPreenchimento: !temValorAntigo || !houveAlteracao
      };
    }

    // Executar atualizaÃ§Ãµes no Monday
    const SECOND_BOARD_ID = '7463706726';
    for (const update of touchpointUpdates) {
      try {
        await this.updateColumn(touchpointId, update.columnId, update.value, SECOND_BOARD_ID);
        fieldsUpdated++;
      } catch (error: any) {
        if (error?.message?.includes('limit has reached of connected items')) {
          console.log(`[UPDATE_TP]   âš ï¸ Campo ${update.columnId} atingiu limite, mantendo valor`);
          fieldsUpdated++;
        } else {
          console.error(`[UPDATE_TP]   âŒ Erro ao atualizar ${update.columnId}:`, error);
        }
      }
    }

    // Recalcular taxonomia se necessÃ¡rio
    const camposQueMudamTaxonomia = ['texto6__1', 'n_meros__1', 'data__1'];
    const mudouTaxonomia = touchpointUpdates.some(u => camposQueMudamTaxonomia.includes(u.columnId));

    if (mudouTaxonomia || touchpointUpdates.length > 0) {
      const canalAtual = touchpointData.canal || currentTouchpoint.canal || '';
      const dataAtual = touchpointData.dataDisparo || touchpointData.data__1 || currentTouchpoint.dataDisparo || '';
      const ordemAtual = touchpointData.ordemCanal || currentTouchpoint.numeroDisparo || 1;

      const campaignTaxonomy = {
        tipoCliente: formData.tipoClienteRelation || currentData.tipoCliente,
        tipoCampanha: formData.tipoCampanhaRelation || currentData.tipoCampanha,
        tipoDisparo: formData.tipoDisparo || currentData.tipoDisparo,
        mecanica: formData.mecanicaRelation || currentData.mecanicaCampanha,
        areaSolicitante: formData.areaSolicitanteRelation || currentData.areaSolicitante,
        objetivo: formData.objetivoRelation || currentData.objetivoCampanha,
        produto: formData.produtoRelation || currentData.produtoServico,
        segmento: formData.segmentoRelation || currentData.segmentoPublico,
      };

      taxonomyUpdated = await this.recalculateTouchpointTaxonomy(
        touchpointId,
        campaignId,
        { canal: canalAtual, dataDisparo: dataAtual, ordemCanal: ordemAtual },
        campaignTaxonomy
      );
    }

    // Processar agendamento apÃ³s atualizaÃ§Ãµes no Monday
    if (scheduleUpdateInfo) {
      console.log(`[UPDATE_TP] ðŸ”„ Processando agendamento...`);
      await this.updateTouchpointScheduling(scheduleUpdateInfo);
    }

    return { fieldsUpdated, taxonomyUpdated };
  }

  /**
   * Gerencia agendamentos (channel schedules) de um touchpoint
   * Deleta agendamento antigo e cria novo quando canal/data/hora mudam
   * 
   * @param scheduleInfo InformaÃ§Ãµes sobre mudanÃ§a de agendamento
   */
  private async updateTouchpointScheduling(scheduleInfo: {
    touchpointId: string;
    oldCanal: string;
    oldData: string;
    oldHora: string;
    newCanal: string;
    newData: string;
    newHora: string;
    volumeDisparo: number;
    areaSolicitante: string;
    isPrimeiroPreenchimento: boolean;
  }): Promise<void> {
    const { oldCanal, oldData, oldHora, newCanal, newData, newHora, volumeDisparo, areaSolicitante, isPrimeiroPreenchimento } = scheduleInfo;

    try {
      const channelScheduleRepository: Repository<ChannelSchedule> = AppDataSource.getRepository(ChannelSchedule);

      // 1. Deletar agendamento antigo
      const canalParaDeletar = oldCanal || newCanal;

      if (!isPrimeiroPreenchimento && canalParaDeletar && oldData && oldHora) {
        console.log(`[SCHEDULE] ðŸ—‘ï¸ Deletando: canal="${canalParaDeletar}", hora="${oldHora}"`);

        const query = `query { boards(ids: 7400353565) { items_page(limit: 500) { items { id name } } } }`;
        const response = await this.makeGraphQLRequest(query);
        const items = response.data?.boards?.[0]?.items_page?.items || [];
        const canalItem = items.find((item: any) => item.name === canalParaDeletar);

        if (canalItem) {
          const oldCanalId = canalItem.id;
          const oldDataMysql = this.convertDateFormat(oldData);
          const dataString = new Date(oldDataMysql).toISOString().split('T')[0];
          const horaFormatted = oldHora.substring(0, 5);

          const agendamentosAntigos = await channelScheduleRepository
            .createQueryBuilder('schedule')
            .where('schedule.id_canal = :id_canal', { id_canal: oldCanalId })
            .andWhere('DATE(schedule.data) = :data', { data: dataString })
            .getMany();

          const paraDeltar = agendamentosAntigos.filter(s => {
            const matchHora = s.hora.substring(0, 5) === horaFormatted;
            const matchArea = !areaSolicitante || s.area_solicitante === areaSolicitante;
            return matchHora && matchArea;
          });

          if (paraDeltar.length > 0) {
            await channelScheduleRepository.delete(paraDeltar.map(s => s.id));
            console.log(`[SCHEDULE] âœ… ${paraDeltar.length} agendamento(s) deletado(s)`);
          }
        }
      }

      // 2. Criar novo agendamento
      if (newCanal && newData && newHora) {
        console.log(`[SCHEDULE] âž• Criando: canal="${newCanal}", hora="${newHora}"`);

        const query = `query { boards(ids: 7400353565) { items_page(limit: 500) { items { id name } } } }`;
        const response = await this.makeGraphQLRequest(query);
        const items = response.data?.boards?.[0]?.items_page?.items || [];
        const canalItem = items.find((item: any) => item.name === newCanal);

        if (canalItem) {
          const newCanalId = canalItem.id;
          const newDataMysql = this.convertDateFormat(newData);

          const novoAgendamento = channelScheduleRepository.create({
            id_canal: newCanalId,
            data: newDataMysql as any,
            hora: newHora,
            qtd: volumeDisparo,
            area_solicitante: areaSolicitante,
            tipo: 'agendamento'
          });

          await channelScheduleRepository.save(novoAgendamento);
          console.log(`[SCHEDULE] âœ… Agendamento criado: ${newCanal} / ${newHora} / ${volumeDisparo.toLocaleString('pt-BR')}`);
        }
      }
    } catch (error) {
      console.error(`[SCHEDULE] âš ï¸ Erro ao processar agendamento:`, error);
    }
  }

  /**
   * Atualiza todos os touchpoints de uma campanha
   * Cria novos touchpoints quando necessÃ¡rio
   * Atualiza campos e taxonomia de touchpoints existentes
   * 
   * @param campaignId ID da campanha principal
   * @param formData Dados do formulÃ¡rio (inclui __SUBITEMS__)
   * @param currentData Dados atuais da campanha (inclui __SUBITEMS__)
   * @returns { touchpointsCreated, touchpointsUpdated } - Contadores
   */
  private async updateCampaignTouchpoints(
    campaignId: string,
    formData: any,
    currentData: any
  ): Promise<{ touchpointsCreated: number; touchpointsUpdated: number }> {
    let touchpointsCreated = 0;
    let touchpointsUpdated = 0;

    console.log(`[TOUCHPOINTS] Processando touchpoints da campanha ${campaignId}...`);

    if (!formData.__SUBITEMS__ || formData.__SUBITEMS__.length === 0) {
      console.log(`[TOUCHPOINTS] Nenhum touchpoint para processar`);
      return { touchpointsCreated, touchpointsUpdated };
    }

    console.log(`[TOUCHPOINTS] ${formData.__SUBITEMS__.length} touchpoint(s) no formulÃ¡rio`);
    console.log(`[TOUCHPOINTS] IDs atuais no Monday:`, currentData.__SUBITEMS__?.map((t: any) => t.id) || []);

    for (const touchpoint of formData.__SUBITEMS__) {
      if (!touchpoint.id) {
        console.log(`[TOUCHPOINTS] âš ï¸  Touchpoint sem ID, serÃ¡ criado`);
      }

      console.log(`[TOUCHPOINTS] ðŸ” Processando touchpoint ID: ${touchpoint.id}`);

      const currentTouchpoint = touchpoint.id
        ? currentData.__SUBITEMS__?.find((tp: any) => String(tp.id) === String(touchpoint.id))
        : null;

      // CRIAR NOVO TOUCHPOINT
      if (!currentTouchpoint) {
        console.log(`[TOUCHPOINTS] ðŸ†• Criando novo touchpoint`);
        try {
          const newTouchpointSubitem: SubitemData = {
            id: touchpoint.id && /^\d+$/.test(touchpoint.id) ? touchpoint.id : undefined,
            conectar_quadros87__1: touchpoint.canal,
            data__1: touchpoint.dataDisparo || touchpoint.data__1,
            n_meros__1: touchpoint.ordemCanal || touchpoint.n_meros__1 || 1,
            texto__1: touchpoint.descricao || touchpoint.texto__1 || '',
            lista_suspensa5__1: touchpoint.beneficio || touchpoint.lista_suspensa5__1,
            lista_suspensa53__1: touchpoint.gatilho || touchpoint.lista_suspensa53__1 || [],
            conectar_quadros_mkkcnyr3: touchpoint.horaDisparo || touchpoint.conectar_quadros_mkkcnyr3,
            n_meros_mkkchcmk: touchpoint.volumeDisparo || touchpoint.n_meros_mkkchcmk,
          };

          // Buscar dados taxonÃ´micos da campanha
          const tipoCliente = formData.tipoClienteRelation || currentData.tipoCliente || '';
          const tipoCampanha = formData.tipoCampanhaRelation || currentData.tipoCampanha || '';
          const tipoDisparo = formData.tipoDisparo || currentData.tipoDisparo || '';
          const mecanica = formData.mecanicaRelation || currentData.mecanicaCampanha || '';
          const areaSolicitante = formData.areaSolicitanteRelation || currentData.areaSolicitante || '';
          const objetivo = formData.objetivoRelation || currentData.objetivoCampanha || '';
          const produto = formData.produtoRelation || currentData.produtoServico || '';
          const segmento = formData.segmentoRelation || currentData.segmentoPublico || '';

          const enrichedFormData: FormSubmissionData = {
            id: `touchpoint_create_${Date.now()}`,
            timestamp: new Date().toISOString(),
            formTitle: 'Criar Touchpoint em Modo EdiÃ§Ã£o',
            data: {
              name: currentData.name || formData.name,
              lookup_mkrtaebd: tipoCliente,
              lookup_mkrt66aq: tipoCampanha,
              lookup_mkrtxa46: tipoDisparo,
              lookup_mkrta7z1: mecanica,
              lookup_mkrt36cj: areaSolicitante,
              lookup_mkrtwq7k: objetivo,
              lookup_mkrtvsdj: produto,
              lookup_mkrtxgmt: segmento,
              area_solicitante: areaSolicitante,
              __SUBITEMS__: [newTouchpointSubitem]
            }
          };

          // Ajustar capacidade ANTES de criar
          const adjustedSubitems = await this.adjustTouchpointCapacity(
            [newTouchpointSubitem],
            enrichedFormData.data.lookup_mkrt36cj
          );

          console.log(`[TOUCHPOINTS] Capacidade ajustada: ${adjustedSubitems.length} touchpoint(s)`);

          // Criar agendamentos ANTES de criar touchpoints
          await this.insertChannelSchedulesForTouchpoints(adjustedSubitems, enrichedFormData.data.lookup_mkrt36cj);

          // Criar cada touchpoint ajustado
          for (const adjustedSubitem of adjustedSubitems) {
            const createdTouchpointId = await this.createTouchpointForCampaign(
              campaignId,
              enrichedFormData,
              adjustedSubitem
            );

            if (createdTouchpointId) {
              console.log(`[TOUCHPOINTS] âœ… Touchpoint criado: ${createdTouchpointId}`);
              touchpointsCreated++;
            }
          }
        } catch (error) {
          console.error(`[TOUCHPOINTS] âŒ Erro ao criar touchpoint:`, error);
        }
        continue;
      }

      // ATUALIZAR TOUCHPOINT EXISTENTE
      console.log(`[TOUCHPOINTS] Atualizando touchpoint existente ${touchpoint.id}`);

      const { fieldsUpdated, taxonomyUpdated } = await this.updateTouchpointFields(
        touchpoint.id,
        touchpoint,
        currentTouchpoint,
        campaignId,
        formData,
        currentData
      );

      touchpointsUpdated += fieldsUpdated + taxonomyUpdated;
    }

    console.log(`[TOUCHPOINTS] âœ… Criados: ${touchpointsCreated}, Atualizados: ${touchpointsUpdated} campos`);
    return { touchpointsCreated, touchpointsUpdated };
  }

  /**
   * Atualiza uma campanha existente no Monday.com
   * Compara os valores atuais com os novos e atualiza apenas os campos modificados
   *
   * FUNCIONALIDADES:
   * - âœ… Atualiza campos da CAMPANHA PRINCIPAL (board 7410140027)
   * - âœ… Atualiza MÃšLTIPLOS TOUCHPOINTS/GAM (board 7463706726)
   * - âœ… Atualiza BRIEFING (board 9169887721)
   *
   * @param campaignId ID do item da campanha no Monday (board principal)
   * @param formData Dados do formulÃ¡rio enviados pelo frontend (pode incluir __SUBITEMS__ e briefing)
   */
  async updateCampaign(campaignId: string, formData: any): Promise<any> {
    try {
      console.log(`[UPDATE] ========================================`);
      console.log(`[UPDATE] Iniciando atualizaÃ§Ã£o da campanha ${campaignId}`);
      console.log(`[UPDATE] âœ… Campanha Principal, Touchpoints e Briefing serÃ£o atualizados`);
      console.log(`[UPDATE] ========================================`);

      // 1. Buscar dados atuais da campanha
      const currentData = await this.getCampaignDetails(campaignId);
      console.log(`[UPDATE] Dados atuais recuperados`);

      // 2. Atualizar nome se necessÃ¡rio
      const nameUpdated = await this.updateCampaignNameIfChanged(campaignId, formData.name, currentData.name);

      // 3. Coletar e aplicar atualizaÃ§Ãµes de campos da campanha principal
      const updatesToMake = this.collectCampaignFieldUpdates(formData, currentData);
      const updatedCount = await this.applyCampaignFieldUpdates(campaignId, updatesToMake);

      // 5. Atualizar TOUCHPOINTS (__SUBITEMS__) se existirem
      console.log(`[UPDATE] ========================================`);
      const { touchpointsCreated, touchpointsUpdated } = await this.updateCampaignTouchpoints(campaignId, formData, currentData);
      console.log(`[UPDATE] ========================================`);

      // 6. Atualizar BRIEFING se existir
      const briefingUpdated = await this.updateCampaignBriefing(formData.briefing, currentData.briefing);

      console.log(`[UPDATE] ========================================`);
      console.log(`[UPDATE] RESUMO FINAL:`);
      console.log(`[UPDATE]   Campanha principal: ${updatedCount} campos`);
      console.log(`[UPDATE]   Touchpoints atualizados: ${touchpointsUpdated} campos`);
      console.log(`[UPDATE]   Touchpoints criados: ${touchpointsCreated} novos`);
      console.log(`[UPDATE]   Briefing: ${briefingUpdated} campos`);
      console.log(`[UPDATE]   TOTAL: ${updatedCount + touchpointsUpdated + briefingUpdated} campos atualizados`);
      console.log(`[UPDATE] ========================================`);

      return {
        updatedFields: updatedCount + touchpointsUpdated + briefingUpdated + (nameUpdated ? 1 : 0),
        totalChanges: updatesToMake.length,
        campaignId: campaignId,
        touchpointsUpdated,
        touchpointsCreated,
        briefingUpdated,
        nameUpdated
      };

    } catch (error) {
      console.error('[UPDATE] Erro ao atualizar campanha:', error);
      throw new Error(`Falha ao atualizar campanha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca horÃ¡rios ativos via API do Monday quando nÃ£o estÃ£o na tabela local
   */
  private async fetchTimeSlotsFromAPI(boardNumericId: string): Promise<any[]> {
    try {
      // Primeiro, buscar o UUID do board na tabela monday_boards
      const boardRepository = AppDataSource.getRepository('MondayBoard');
      let board = await boardRepository.findOne({
        where: { board_id: boardNumericId }
      });

      // Se nÃ£o encontrar pelo board_id, tentar pelo nome "Hora"
      if (!board) {
        console.log(`[FETCH_TIMESLOTS] Board ${boardNumericId} nÃ£o encontrado, buscando pelo nome "Hora"...`);
        board = await boardRepository.findOne({
          where: { name: 'Hora' }
        });
      }

      if (!board) {
        console.error(`[FETCH_TIMESLOTS] Board "Hora" nÃ£o encontrado na tabela monday_boards`);
        return [];
      }

      const boardUuid = board.id;
      console.log(`[FETCH_TIMESLOTS] Board "${board.name}" (${boardUuid}) encontrado`);

      const query = `
        query {
          boards(ids: ["${boardUuid}"]) {
            items_page(limit: 100) {
              items {
                id
                name
              }
            }
          }
        }
      `;

      const response = await this.makeGraphQLRequest(query);
      const items = response.data?.boards?.[0]?.items_page?.items || [];
      console.log(`[FETCH_TIMESLOTS] ${items.length} items retornados da API`);

      if (items.length === 0) {
        console.log(`[FETCH_TIMESLOTS] âš ï¸ Nenhum item retornado, usando horÃ¡rios padrÃ£o`);
        // Fallback: usar horÃ¡rios padrÃ£o se a API nÃ£o retornar nada
        const defaultTimeSlots = [
          '06:00', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00',
          '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
          '18:00', '19:00', '20:00', '21:00', '22:00'
        ];
        
        return defaultTimeSlots.map(name => ({
          item_id: `time_${name.replace(':', '')}`,
          name: name,
          status: 'Ativo',
          board_id: boardNumericId
        }));
      }

      // Mapear todos os items (sem filtrar por status jÃ¡ que nÃ£o temos a coluna)
      const activeItems = items
        .map((item: any) => ({
          item_id: item.id,
          name: item.name,
          status: 'Ativo',
          board_id: boardNumericId
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return activeItems;
    } catch (error) {
      console.error('[FETCH_TIMESLOTS] Erro ao buscar horÃ¡rios via API:', error);
      return [];
    }
  }

  /**
   * Ajusta capacidade de touchpoints, distribuindo entre horÃ¡rios se necessÃ¡rio
   * Baseado em adjustSubitemsCapacity do processNewCRM
   */
  public async adjustTouchpointCapacity(
    subitems: SubitemData[],
    areaSolicitante?: string
  ): Promise<SubitemData[]> {
    const TIME_SLOTS_BOARD_ID = '7696913518';
    const mondayItemRepository = AppDataSource.getRepository('MondayItem');

    // Tentar buscar horÃ¡rios da tabela local primeiro
    let activeTimeSlots = await mondayItemRepository.find({
      where: { board_id: TIME_SLOTS_BOARD_ID, status: 'Ativo' },
      order: { name: 'ASC' }
    });

    console.log(`[ADJUST] ${activeTimeSlots.length} horÃ¡rios encontrados na tabela local`);
    
    // Se nÃ£o encontrar na tabela, buscar via GraphQL
    if (activeTimeSlots.length === 0) {
      console.log(`[ADJUST] âš ï¸ Tabela local vazia, buscando horÃ¡rios via GraphQL...`);
      activeTimeSlots = await this.fetchTimeSlotsFromAPI(TIME_SLOTS_BOARD_ID);
      console.log(`[ADJUST] ${activeTimeSlots.length} horÃ¡rios obtidos via API`);
    }

    if (activeTimeSlots.length > 0) {
      console.log(`[ADJUST] Primeiros 5 horÃ¡rios disponÃ­veis:`);
      activeTimeSlots.slice(0, 5).forEach(slot => {
        console.log(`[ADJUST]   - ${slot.name}`);
      });
    } else {
      console.error(`[ADJUST] âŒ NENHUM HORÃRIO DISPONÃVEL! ImpossÃ­vel distribuir capacidade.`);
    }

    // Preservar id_original (serÃ¡ o ID do canal do board Canal)
    const items: SubitemData[] = [];
    for (const s of subitems) {
      const canalNome = String(s.conectar_quadros87__1 || '').trim();
      if (canalNome) {
        const canalItem = await mondayItemRepository.findOne({ where: { name: canalNome } });
        items.push({ ...s, id_original: canalItem?.item_id || canalNome });
      } else {
        items.push({ ...s });
      }
    }
    const key = (canal: string, data: string, hora: string) => `${canal}|${data}|${hora}`;

    let changed = true;
    while (changed) {
      changed = false;
      const staged: Record<string, number> = {};

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const canalNome = String(item.conectar_quadros87__1 || '').trim();
        const dataStr = String(item.data__1 || '').trim();
        const horaAtual = String(item.conectar_quadros_mkkcnyr3 || '').trim();
        const demanda = Number(item.n_meros_mkkchcmk || 0);

        if (!canalNome || !dataStr || !horaAtual || demanda <= 0) {
          items.splice(i, 1);
          changed = true;
          break;
        }

        // Buscar ID do canal
        const canalItem = await mondayItemRepository.findOne({ where: { name: canalNome } });
        if (!canalItem?.item_id) {
          console.warn(`[ADJUST] Canal ${canalNome} nÃ£o encontrado`);
          continue;
        }

        const idCanal = canalItem.item_id;
        const maxValue = Number(canalItem.max_value || 0);
        if (!maxValue) continue;

        // HorÃ¡rios especiais que compartilham limite
        const splitHours = ["08:00", "08:30"];
        const effectiveMaxValue = splitHours.includes(horaAtual) ? maxValue / 2 : maxValue;

        // Calcular disponibilidade
        const dbReserved = await this.sumReservedQtyForTouchpoint(idCanal, dataStr, horaAtual, areaSolicitante);
        const stagedReserved = staged[key(idCanal, dataStr, horaAtual)] || 0;
        const available = Math.max(0, effectiveMaxValue - (dbReserved + stagedReserved));

        console.log(`[ADJUST] ${horaAtual}: Limite=${effectiveMaxValue}, Ocupado=${dbReserved}, Staged=${stagedReserved}, DisponÃ­vel=${available}, Demanda=${demanda}`);

        if (demanda <= available) {
          staged[key(idCanal, dataStr, horaAtual)] = (staged[key(idCanal, dataStr, horaAtual)] || 0) + demanda;
          console.log(`[ADJUST] âœ… Alocado ${demanda} em ${horaAtual}`);
          continue;
        }

        if (available <= 0) {
          // Mover tudo para prÃ³ximo horÃ¡rio
          const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
          const nextIndex = idx >= 0 ? idx + 1 : 0;
          if (nextIndex >= activeTimeSlots.length) {
            console.warn(`[ADJUST] âŒ Sem prÃ³ximo horÃ¡rio apÃ³s ${horaAtual}`);
            items.splice(i, 1);
            changed = true;
            break;
          }
          const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
          console.log(`[ADJUST] â© Movendo ${demanda} de ${horaAtual} para ${nextHora}`);
          items[i] = { ...item, conectar_quadros_mkkcnyr3: nextHora };
          changed = true;
          break;
        }

        // Dividir entre horÃ¡rio atual e prÃ³ximo
        console.log(`[ADJUST] âš ï¸ Dividindo demanda: ${available.toLocaleString('pt-BR')} em ${horaAtual}, restante: ${(demanda - available).toLocaleString('pt-BR')}`);
        item.n_meros_mkkchcmk = available;
        staged[key(idCanal, dataStr, horaAtual)] = (staged[key(idCanal, dataStr, horaAtual)] || 0) + available;
        const restante = demanda - available;

        const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
        const nextIndex = idx >= 0 ? idx + 1 : 0;
        if (nextIndex >= activeTimeSlots.length) {
          console.warn(`[ADJUST] âŒ Sem prÃ³ximo horÃ¡rio. Restante ${restante} perdido`);
          continue;
        }

        const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
        console.log(`[ADJUST] ðŸ”„ Criando novo touchpoint: ${restante.toLocaleString('pt-BR')} em ${nextHora}`);
        const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: nextHora, n_meros_mkkchcmk: restante };
        items.splice(i + 1, 0, novoSubitem);
        console.log(`[ADJUST] âœ… Array agora tem ${items.length} touchpoint(s)`);
        changed = true;
        break;
      }
    }

    return items.filter(it => Number(it.n_meros_mkkchcmk || 0) > 0);
  }

  /**
   * Soma quantidade reservada em channel_schedules
   */
  private async sumReservedQtyForTouchpoint(
    idCanal: string,
    dataStr: string,
    hora: string,
    areaSolicitante?: string
  ): Promise<number> {
    const channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
    
    // Converter data para formato MySQL YYYY-MM-DD
    const mysqlData = this.convertDateFormat(dataStr);

    const schedules = await channelScheduleRepository.find({
      where: { id_canal: idCanal, data: mysqlData as any, hora: hora }
    });

    console.log(`[SUM_RESERVED] Canal ${idCanal}, Data ${mysqlData}, Hora ${hora}: ${schedules.length} agendamento(s) encontrado(s)`);

    let totalOcupado = 0;
    schedules.forEach(schedule => {
      const qtd = parseFloat(schedule.qtd.toString());
      const tipo = schedule.tipo || 'agendamento';
      console.log(`[SUM_RESERVED]   - Tipo: ${tipo}, Qtd: ${qtd.toLocaleString('pt-BR')}, Ãrea: ${schedule.area_solicitante}`);

      if (tipo === 'agendamento') {
        totalOcupado += qtd;
      } else if (tipo === 'reserva') {
        // Reservas de outras Ã¡reas contam
        if (!areaSolicitante || schedule.area_solicitante !== areaSolicitante) {
          totalOcupado += qtd;
        }
      }
    });

    console.log(`[SUM_RESERVED] Total ocupado: ${totalOcupado.toLocaleString('pt-BR')}`);
    return totalOcupado;
  }

  /**
   * Cria um novo touchpoint no board secundÃ¡rio para uma campanha existente
   * @param campaignId ID da campanha no board principal
   * @param formData Dados do formulÃ¡rio com informaÃ§Ãµes da campanha
   * @param subitem Dados do subitem (touchpoint) a ser criado
   * @returns ID do touchpoint criado
   */
  private async createTouchpointForCampaign(
    campaignId: string,
    formData: FormSubmissionData,
    subitem: SubitemData
  ): Promise<string | null> {
    try {
      const SECOND_BOARD_ID = '7463706726';
      const SECOND_BOARD_GROUP_ID = 'topics';

      console.log(`[CREATE_TOUCHPOINT] Iniciando criaÃ§Ã£o de touchpoint para campanha ${campaignId}`);

      const mondayItemRepository = AppDataSource.getRepository('MondayItem');

      // Usar descriÃ§Ã£o do subitem como nome do item
      const descricao = subitem.descricao || subitem.texto__1 || formData.data.name || 'Touchpoint';
      const itemName = String(descricao).trim();
      
      // Canal pode vir como nome (texto) ou ID (nÃºmero)
      // Se for nÃºmero, buscar o nome no banco
      let canalNome = String(subitem.conectar_quadros87__1 || 'Email').trim();
      
      // Se canalNome parecer um ID (sÃ³ dÃ­gitos), buscar o nome real
      if (/^\d+$/.test(canalNome)) {
        console.log(`[CREATE_TOUCHPOINT] âš ï¸ Canal recebido como ID: ${canalNome}, buscando nome...`);
        const canalItem = await mondayItemRepository.findOne({ where: { item_id: canalNome } });
        if (canalItem?.name) {
          canalNome = canalItem.name;
          console.log(`[CREATE_TOUCHPOINT] âœ… Nome do canal encontrado: ${canalNome}`);
        }
      }

      console.log('ðŸ” [CREATE_TOUCHPOINT] Valores recebidos:');
      console.log('  - subitem.descricao:', subitem.descricao);
      console.log('  - subitem.texto__1:', subitem.texto__1);
      console.log('  - subitem.conectar_quadros87__1 (original):', subitem.conectar_quadros87__1);
      console.log('  - formData.data.name:', formData.data.name);
      console.log('  - itemName final:', itemName);
      console.log('  - canalNome final:', canalNome);

      // IMPORTANTE: Preencher TODOS os campos taxonÃ´micos (igual ao modo CREATE)
      // Buscar board_id do board "Produto" para evitar colisÃ£o
      const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
      const produtoBoardId = produtoBoard?.id;

      // Payload com todos os campos necessÃ¡rios
      const cv: Record<string, any> = {
        n_meros__1: subitem.n_meros__1 || 1, // Ordem
        texto__1: itemName, // DescriÃ§Ã£o (usar o mesmo valor do nome do item)
        n_meros_mkkchcmk: subitem.n_meros_mkkchcmk || 1000, // Volume
        text_mkvgjh0w: String(subitem.conectar_quadros_mkkcnyr3 || '09:00'), // Hora do disparo
        texto6__1: canalNome // Nome do canal (campo de texto - SEM LIMITE)
      };

      // ===== CAMPOS TAXONÃ”MICOS (mesma lÃ³gica do modo CREATE) =====
      
      // date_mkrk5v4c: data de hoje
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      cv['date_mkrk5v4c'] = { date: `${yyyy}-${mm}-${dd}` };

      // text_mkr3v9k3: data do disparo do subitem
      if (subitem.data__1) {
        cv['text_mkr3v9k3'] = String(subitem.data__1);
      }

      // text_mkrr6jkh: ID da campanha principal
      cv['text_mkrr6jkh'] = String(campaignId);

      // Canal (ReferÃªncia + CÃ³digo)
      cv['text_mkrrqsk6'] = canalNome; // ReferÃªncia Canal
      if (canalNome) {
        const canalCode = await this.getCodeByItemName(canalNome);
        cv['text_mkrr8dta'] = canalCode || 'Email'; // CÃ³digo Canal
      } else {
        cv['text_mkrr8dta'] = 'Email';
      }

      // Cliente (ReferÃªncia + CÃ³digo)
      const tipoCliente = String(formData.data.lookup_mkrtaebd || '').trim();
      cv['text_mkrrg2hp'] = tipoCliente;
      if (tipoCliente) {
        const clienteCode = await this.getCodeByItemName(tipoCliente);
        cv['text_mkrrna7e'] = clienteCode || 'NaN';
      } else {
        cv['text_mkrrna7e'] = 'NaN';
      }

      // Campanha (ReferÃªncia + CÃ³digo)
      const tipoCampanha = String(formData.data.lookup_mkrt66aq || '').trim();
      cv['text_mkrra7df'] = tipoCampanha;
      if (tipoCampanha) {
        const campanhaCode = await this.getCodeByItemName(tipoCampanha);
        cv['text_mkrrcnpx'] = campanhaCode || 'NaN';
      } else {
        cv['text_mkrrcnpx'] = 'NaN';
      }

      // Disparo (ReferÃªncia + CÃ³digo)
      const tipoDisparo = String(formData.data.lookup_mkrtxa46 || '').trim();
      cv['text_mkrr9edr'] = tipoDisparo;
      if (tipoDisparo) {
        const disparoCode = await this.getCodeByItemName(tipoDisparo);
        cv['text_mkrrmjcy'] = disparoCode || 'NaN';
      } else {
        cv['text_mkrrmjcy'] = 'NaN';
      }

      // MecÃ¢nica (ReferÃªncia + CÃ³digo)
      const mecanica = String(formData.data.lookup_mkrta7z1 || '').trim();
      cv['text_mkrrxf48'] = mecanica;
      if (mecanica) {
        const mecanicaCode = await this.getCodeByItemName(mecanica);
        cv['text_mkrrxpjd'] = mecanicaCode || 'NaN';
      } else {
        cv['text_mkrrxpjd'] = 'NaN';
      }

      // Ãrea Solicitante (ReferÃªncia + CÃ³digo)
      let areaSolicitanteValue = String(formData.data.lookup_mkrt36cj || '').trim();
      if (areaSolicitanteValue && /^\d+$/.test(areaSolicitanteValue)) {
        // Se Ã© ID numÃ©rico, buscar o nome
        const item = await this.mondayItemRepository.findOne({ where: { item_id: areaSolicitanteValue } });
        if (item) {
          areaSolicitanteValue = item.name || areaSolicitanteValue;
          cv['text_mkrrmmvv'] = item.code || 'NaN';
        } else {
          cv['text_mkrrmmvv'] = 'NaN';
        }
      } else if (areaSolicitanteValue) {
        const areaCode = await this.getCodeByItemName(areaSolicitanteValue);
        cv['text_mkrrmmvv'] = areaCode || 'NaN';
      } else {
        cv['text_mkrrmmvv'] = 'NaN';
      }
      cv['text_mkrrxqng'] = areaSolicitanteValue;

      // Objetivo (ReferÃªncia + CÃ³digo)
      const objetivo = String(formData.data.lookup_mkrtwq7k || '').trim();
      cv['text_mkrrhdh6'] = objetivo;
      if (objetivo) {
        const objetivoCode = await this.getCodeByItemName(objetivo);
        cv['text_mkrrraz2'] = objetivoCode || 'NaN';
      } else {
        cv['text_mkrrraz2'] = 'NaN';
      }

      // Produto (ReferÃªncia + CÃ³digo)
      const produto = String(formData.data.lookup_mkrtvsdj || '').trim();
      cv['text_mkrrfqft'] = produto;
      if (produto) {
        const produtoCode = await this.getCodeByItemName(produto, produtoBoardId);
        cv['text_mkrrjrnw'] = produtoCode || 'NaN';
      } else {
        cv['text_mkrrjrnw'] = 'NaN';
      }

      // Subproduto (ReferÃªncia + CÃ³digo)
      if (produto) {
        const subproductData = await this.getSubproductByProduct(produto);
        if (subproductData) {
          cv['text_mkw8et4w'] = subproductData.name; // ReferÃªncia Subproduto
          cv['text_mkw8jfw0'] = subproductData.code; // CÃ³digo Subproduto
          console.log(`[CREATE_TOUCHPOINT] Subproduto encontrado: ${subproductData.name} (${subproductData.code})`);
        } else {
          cv['text_mkw8et4w'] = '';
          cv['text_mkw8jfw0'] = '';
        }
      } else {
        cv['text_mkw8et4w'] = '';
        cv['text_mkw8jfw0'] = '';
      }

      // Segmento (ReferÃªncia + CÃ³digo)
      const segmento = String(formData.data.lookup_mkrtxgmt || '').trim();
      cv['text_mkrrt32q'] = segmento;
      if (segmento) {
        const segmentoCode = await this.getCodeByItemName(segmento);
        cv['text_mkrrhdf8'] = segmentoCode || 'NaN';
      } else {
        cv['text_mkrrhdf8'] = 'NaN';
      }

      // Campos compostos de taxonomia (text_mkr5kh2r e text_mkr3jr1s)
      const taxonomyParts = [
        subitem.data__1 ? String(subitem.data__1).replace(/-/g, '') : '', // YYYYMMDD
        `id-${campaignId}`,
        cv['text_mkrrna7e'] || '', // CÃ³digo Cliente
        cv['text_mkrrcnpx'] || '', // CÃ³digo Campanha
        cv['text_mkrrmjcy'] || '', // CÃ³digo Disparo
        cv['text_mkrrxpjd'] || '', // CÃ³digo MecÃ¢nica
        cv['text_mkrrmmvv'] || '', // CÃ³digo Ãrea Solicitante
        cv['text_mkrrraz2'] || '', // CÃ³digo Objetivo
        cv['text_mkrrjrnw'] || '', // CÃ³digo Produto
        cv['text_mkrrhdf8'] || ''  // CÃ³digo Segmento
      ].filter(p => p !== '').join('-');
      
      const compositeTaxonomy = `${taxonomyParts}-${cv['n_meros__1']}-${canalNome}`;
      cv['text_mkr5kh2r'] = compositeTaxonomy;
      cv['text_mkr3jr1s'] = compositeTaxonomy;

      console.log(`[CREATE_TOUCHPOINT] Taxonomia gerada: ${compositeTaxonomy}`);

      // ===== FIM CAMPOS TAXONÃ”MICOS =====

      // Adicionar data se disponÃ­vel
      if (subitem.data__1) {
        cv['data__1'] = { date: String(subitem.data__1) };
      }

      // BenefÃ­cio (dropdown simples)
      if (subitem.lista_suspensa5__1) {
        cv['lista_suspensa5__1'] = subitem.lista_suspensa5__1;
        console.log(`[CREATE_TOUCHPOINT] BenefÃ­cio: ${subitem.lista_suspensa5__1}`);
      }

      // Gatilho (tags - mÃºltiplos valores)
      if (subitem.lista_suspensa53__1) {
        if (Array.isArray(subitem.lista_suspensa53__1)) {
          cv['lista_suspensa53__1'] = { labels: subitem.lista_suspensa53__1 };
          console.log(`[CREATE_TOUCHPOINT] Gatilhos (array): ${JSON.stringify(subitem.lista_suspensa53__1)}`);
        } else {
          cv['lista_suspensa53__1'] = { labels: [String(subitem.lista_suspensa53__1)] };
          console.log(`[CREATE_TOUCHPOINT] Gatilho (string): ${subitem.lista_suspensa53__1}`);
        }
      }

      // Criar item no board secundÃ¡rio
      const columnValuesJson = JSON.stringify(cv).replace(/"/g, '\\"');
      const createMutation = `
        mutation {
          create_item(
            board_id: ${SECOND_BOARD_ID},
            group_id: "${SECOND_BOARD_GROUP_ID}",
            item_name: "${itemName.replace(/"/g, '\\"')}",
            create_labels_if_missing: true,
            column_values: "${columnValuesJson}"
          ) {
            id
            name
          }
        }
      `;

      console.log(`[CREATE_TOUCHPOINT] Criando item simplificado no board ${SECOND_BOARD_ID}...`);
      const createResponse = await this.makeGraphQLRequest(createMutation);
      const touchpointId = createResponse.data?.create_item?.id;

      if (!touchpointId) {
        throw new Error('ID do touchpoint nÃ£o retornado pela API');
      }

      console.log(`[CREATE_TOUCHPOINT] Touchpoint criado com ID ${touchpointId}`);

      // Segundo envio: campos de board_relation e pessoas
      const connectColumns: Record<string, any> = {};
      
      // conectar_quadros8__1 (link para campanha principal) - OBRIGATÃ“RIO
      connectColumns.conectar_quadros8__1 = { item_ids: [campaignId] };

      // text_mkvgjh0w jÃ¡ foi adicionado no primeiro envio (hora)
      // conectar_quadros_mkkcnyr3 - Conectar Ã  tabela de horÃ¡rios (se necessÃ¡rio)
      if (subitem.conectar_quadros_mkkcnyr3) {
        try {
          const horaItem = await this.mondayItemRepository.findOne({ 
            where: { name: String(subitem.conectar_quadros_mkkcnyr3) } 
          });
          if (horaItem?.item_id) {
            connectColumns.conectar_quadros_mkkcnyr3 = { item_ids: [Number(horaItem.item_id)] };
            console.log(`[CREATE_TOUCHPOINT] Hora ${subitem.conectar_quadros_mkkcnyr3} conectada via board_relation`);
          }
        } catch (error) {
          console.warn(`[CREATE_TOUCHPOINT] Erro ao conectar horÃ¡rio:`, error);
        }
      }

      // NOTA: Canal jÃ¡ foi adicionado via campo texto6__1 (Nome Canal)
      // NÃƒO usar conectar_quadros87__1 pois tem limite de conexÃµes
      console.log(`[CREATE_TOUCHPOINT] Canal "${canalNome}" adicionado via campo texto6__1 (texto)`);

      // Adicionar pessoas5__1 (demandante) e pessoas3__1 (equipe da Ã¡rea)
      const demandanteId = await this.getDemandanteFromCampaign(campaignId);
      
      // Demandante (pessoas5__1)
      if (demandanteId) {
        connectColumns['pessoas5__1'] = { 
          personsAndTeams: [{ id: demandanteId, kind: 'person' }] 
        };
        console.log(`[CREATE_TOUCHPOINT] Demandante ${demandanteId} serÃ¡ adicionado ao campo pessoas5__1`);
      } else {
        console.log(`[CREATE_TOUCHPOINT] âš ï¸ Nenhum demandante encontrado na campanha ${campaignId}`);
      }
      
      // Equipe da Ã¡rea (pessoas3__1)
      const areaSolicitante = String(formData.data.lookup_mkrt36cj || '').trim();
      if (areaSolicitante) {
        const areaItem = await mondayItemRepository.findOne({ where: { name: areaSolicitante } });
        const teamIds = (areaItem?.team || []).map((id: any) => String(id)).filter((s: string) => s.trim().length > 0);
        if (teamIds.length > 0) {
          connectColumns['pessoas3__1'] = {
            personsAndTeams: teamIds.map((id: string) => ({ id, kind: 'team' }))
          };
          console.log(`[CREATE_TOUCHPOINT] Equipe da Ã¡rea ${areaSolicitante} (${teamIds.length} membros) serÃ¡ adicionada ao campo pessoas3__1`);
        }
      }

      // Enviar segundo update - tentar cada campo individualmente para evitar falha total
      let connectionsSuccess = 0;
      
      // Tentar conectar Ã  campanha principal (obrigatÃ³rio)
      try {
        await this.changeMultipleColumnValues(SECOND_BOARD_ID, touchpointId, {
          conectar_quadros8__1: connectColumns.conectar_quadros8__1
        });
        connectionsSuccess++;
        console.log(`[CREATE_TOUCHPOINT] âœ… Touchpoint conectado Ã  campanha ${campaignId}`);
      } catch (error: any) {
        console.error(`[CREATE_TOUCHPOINT] âŒ Erro ao conectar Ã  campanha:`, error.message);
      }

      // Canal jÃ¡ foi adicionado via campo texto6__1 na criaÃ§Ã£o inicial
      // NÃ£o precisa conectar via conectar_quadros87__1 (board_relation com limite)

      // Tentar adicionar demandante (opcional)
      if (connectColumns.pessoas5__1) {
        try {
          console.log(`[CREATE_TOUCHPOINT] Enviando pessoas5__1 (demandante) para updateColumn:`, JSON.stringify(connectColumns.pessoas5__1));
          await this.updateColumn(touchpointId, 'pessoas5__1', connectColumns.pessoas5__1, SECOND_BOARD_ID);
          connectionsSuccess++;
          console.log(`[CREATE_TOUCHPOINT] âœ… Demandante adicionado`);
        } catch (error: any) {
          console.error(`[CREATE_TOUCHPOINT] âŒ Erro ao adicionar demandante:`, error.message);
        }
      }

      // Tentar adicionar equipe (opcional)
      if (connectColumns.pessoas3__1) {
        try {
          console.log(`[CREATE_TOUCHPOINT] Enviando pessoas3__1 (equipe) para updateColumn:`, JSON.stringify(connectColumns.pessoas3__1));
          await this.updateColumn(touchpointId, 'pessoas3__1', connectColumns.pessoas3__1, SECOND_BOARD_ID);
          connectionsSuccess++;
          console.log(`[CREATE_TOUCHPOINT] âœ… Equipe adicionada`);
        } catch (error: any) {
          console.error(`[CREATE_TOUCHPOINT] âŒ Erro ao adicionar equipe:`, error.message);
        }
      }

      console.log(`[CREATE_TOUCHPOINT] ${connectionsSuccess} conexÃµes realizadas com sucesso`);

      console.log(`[CREATE_TOUCHPOINT] âœ… Touchpoint ${touchpointId} criado com sucesso`);
      return touchpointId;
    } catch (error) {
      console.error('[CREATE_TOUCHPOINT] âŒ Erro crÃ­tico ao criar touchpoint:', error);
      return null;
    }
  }

  /**
   * Insere agendamentos para mÃºltiplos touchpoints (como no modo criaÃ§Ã£o)
   * Processa todos os touchpoints ajustados antes de criar os itens no Monday
   */
  private async insertChannelSchedulesForTouchpoints(
    subitems: SubitemData[],
    areaSolicitante: string
  ): Promise<void> {
    try {
      console.log(`[INSERT_SCHEDULES] Iniciando inserÃ§Ã£o de ${subitems.length} agendamento(s)`);
      const channelScheduleRepository: Repository<ChannelSchedule> = AppDataSource.getRepository(ChannelSchedule);
      
      for (let i = 0; i < subitems.length; i++) {
        const subitem = subitems[i];
        console.log(`[INSERT_SCHEDULES] Processando touchpoint ${i + 1}/${subitems.length}`);
        
        // Usar id_original (ID do canal) armazenado durante ajuste
        const idCanal = subitem.id_original;
        if (!idCanal) {
          console.log('[INSERT_SCHEDULES] âš ï¸ Subitem sem id_original, pulando');
          continue;
        }

        const data = subitem.data__1 || '';
        const hora = subitem.conectar_quadros_mkkcnyr3 || '09:00';
        const qtd = subitem.n_meros_mkkchcmk || 0;

        if (!data || qtd <= 0) {
          console.log('[INSERT_SCHEDULES] âš ï¸ Dados insuficientes, pulando');
          continue;
        }

        console.log(`[INSERT_SCHEDULES] Canal: ${idCanal}, Data: ${data}, Hora: ${hora}, Qtd: ${qtd.toLocaleString('pt-BR')}`);

        // Converter data para formato MySQL (YYYY-MM-DD)
        const mysqlData = this.convertDateFormat(data);

        // Criar registro no channel_schedules
        const newSchedule = channelScheduleRepository.create({
          id_canal: idCanal,
          data: mysqlData as any,
          hora: hora,
          qtd: qtd,
          area_solicitante: areaSolicitante,
          tipo: 'agendamento'
        });

        await channelScheduleRepository.save(newSchedule);
        console.log(`[INSERT_SCHEDULES] âœ… Agendamento criado - Canal: ${idCanal}, Data: ${mysqlData}, Hora: ${hora}, Qtd: ${qtd}`);
      }
    } catch (error) {
      console.error('[INSERT_SCHEDULES] Erro ao inserir agendamentos:', error);
    }
  }

  /**
   * Busca o ID do demandante (pessoas__1) da campanha principal
   */
  private async getDemandanteFromCampaign(campaignId: string): Promise<string | null> {
    try {
      const query = `
        query {
          items(ids: [${campaignId}]) {
            id
            column_values(ids: ["pessoas__1"]) {
              id
              value
            }
          }
        }
      `;
      
      const response = await this.makeGraphQLRequest(query);
      const item = response.data?.items?.[0];
      
      if (!item) {
        console.log(`[GET_DEMANDANTE] Campanha ${campaignId} nÃ£o encontrada`);
        return null;
      }
      
      const pessoasColumn = item.column_values?.find((col: any) => col.id === 'pessoas__1');
      if (!pessoasColumn?.value) {
        console.log(`[GET_DEMANDANTE] Campo pessoas__1 vazio na campanha ${campaignId}`);
        return null;
      }
      
      const parsedValue = JSON.parse(pessoasColumn.value);
      console.log(`[GET_DEMANDANTE] Valor bruto pessoas__1:`, pessoasColumn.value);
      console.log(`[GET_DEMANDANTE] Parsed value:`, JSON.stringify(parsedValue, null, 2));
      const personId = parsedValue?.personsAndTeams?.[0]?.id;
      
      if (personId) {
        console.log(`[GET_DEMANDANTE] âœ… Demandante encontrado: ${personId}`);
        return personId;
      } else {
        console.log(`[GET_DEMANDANTE] âš ï¸ Nenhum personId encontrado no parsedValue`);
      }
      
      return null;
    } catch (error) {
      console.error(`[GET_DEMANDANTE] Erro ao buscar demandante:`, error);
      return null;
    }
  }

  /**
   * Converte data para formato MySQL DATE (YYYY-MM-DD)
   */
  private convertDateFormat(dateString: string): string {
    // Se jÃ¡ estÃ¡ no formato YYYY-MM-DD, retornar
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Se estÃ¡ no formato DD/MM/YYYY, converter para YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }
    return dateString;
  }

  /**
   * Atualiza o nome de um item no Monday.com
   * @param itemId ID do item
   * @param newName Novo nome do item
   */
  public async updateItemName(itemId: string, newName: string): Promise<void> {
    const mutation = `
      mutation {
        change_simple_column_value(
          item_id: ${itemId},
          board_id: 7410140027,
          column_id: "name",
          value: ${JSON.stringify(newName)}
        ) {
          id
          name
        }
      }
    `;

    try {
      await this.makeGraphQLRequest(mutation);
    } catch (error) {
      console.error(`[UPDATE] Erro ao atualizar nome do item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Normaliza um valor para comparaÃ§Ã£o
   * Converte arrays, objetos e valores especiais para strings comparÃ¡veis
   */
  private normalizeValueForComparison(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.join(',');
      }
      if (value.personsAndTeams) {
        return value.personsAndTeams.map((p: any) => p.id).join(',');
      }
      // Para timeline, normalizar como "from,to"
      if (value.from !== undefined && value.to !== undefined) {
        return `${value.from},${value.to}`;
      }
      if (value.text !== undefined) {
        return String(value.text);
      }
      if (value.value !== undefined) {
        return String(value.value);
      }
      if (value.date !== undefined) {
        return String(value.date);
      }
      if (value.url !== undefined) {
        return String(value.url);
      }
      return JSON.stringify(value);
    }

    // Para strings com " - ", normalizar para "," (formato timeline vindo do frontend vs do Monday)
    if (typeof value === 'string' && value.includes(' - ')) {
      return value.replace(' - ', ',');
    }

    return String(value);
  }

  /**
   * Atualiza uma coluna especÃ­fica de um item no Monday.com
   * @param itemId ID do item
   * @param columnId ID da coluna
   * @param value Novo valor
   * @param explicitBoardId Board ID explÃ­cito (opcional) - usado quando um columnId existe em mÃºltiplos boards
   */
  private async updateColumn(itemId: string, columnId: string, value: any, explicitBoardId?: string): Promise<void> {
    // IMPORTANTE: Lookup/mirror columns sÃ£o READ-ONLY no Monday.com
    // Elas nÃ£o podem ser atualizadas diretamente - apenas via board relation
    if (columnId.startsWith('lookup_')) {
      console.log(`[UPDATE] âš ï¸  Coluna ${columnId} Ã© lookup/mirror (read-only), pulando. Use o campo de relaÃ§Ã£o correspondente.`);
      return; // Retornar silenciosamente - nÃ£o Ã© erro, apenas nÃ£o faz nada
    }

    // Formatar o valor de acordo com o tipo de coluna
    // CORREÃ‡ÃƒO: Aguardar resoluÃ§Ã£o de Promises para campos que precisam de resoluÃ§Ã£o assÃ­ncrona
    const formattedValue = await Promise.resolve(this.formatValueForMondayUpdate(columnId, value));

    // Determinar qual board usar:
    // 1. Se boardId foi passado explicitamente, usar ele
    // 2. Caso contrÃ¡rio, tentar descobrir pelo column ID no mapeamento
    // 3. Se nÃ£o estiver no mapeamento, assume board principal
    const boardId = explicitBoardId || this.COLUMN_TO_BOARD[columnId] || '7410140027';

    // Para campos complexos (people, board_relation, timeline, date, tags), usar change_multiple_column_values
    // Para campos simples (text, status, numbers), usar change_simple_column_value
    const isComplexField = columnId.startsWith('pessoas') ||
                           columnId.includes('conectar_quadros') ||
                           columnId.includes('link_to_itens') ||
                           columnId.includes('board_relation') ||
                           columnId.includes('sele__o_m_ltipla') ||
                           columnId === 'lista_suspensa53__1' || // Campo de Gatilhos (tags mÃºltiplas)
                           columnId.startsWith('timerange') ||
                           columnId.startsWith('data') ||
                           columnId.startsWith('date_');

    let mutation: string;

    if (isComplexField) {
      // Usar change_multiple_column_values para campos complexos
      const columnValues = {[columnId]: formattedValue};
      console.log(`[UPDATE] Enviando column_values:`, JSON.stringify(columnValues, null, 2));
      
      mutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${itemId},
            board_id: ${boardId},
            column_values: ${JSON.stringify(JSON.stringify(columnValues))}
          ) {
            id
          }
        }
      `;
    } else {
      // Usar change_simple_column_value para campos simples
      // IMPORTANTE: Monday espera que value seja uma STRING JSON
      // Para objetos (datas, etc): fazer duplo stringify para garantir aspas externas no GraphQL
      // Para strings/nÃºmeros: stringify Ãºnico jÃ¡ adiciona aspas
      let valueStr: string;
      if (typeof formattedValue === 'object' && formattedValue !== null) {
        // Objetos: primeiro stringify transforma em JSON, segundo adiciona aspas externas
        const jsonStr = JSON.stringify(formattedValue);
        valueStr = JSON.stringify(jsonStr);
      } else {
        // Strings/nÃºmeros: stringify Ãºnico
        valueStr = JSON.stringify(formattedValue);
      }
      
      mutation = `
        mutation {
          change_simple_column_value(
            item_id: ${itemId},
            board_id: ${boardId},
            column_id: "${columnId}",
            value: ${valueStr}
          ) {
            id
          }
        }
      `;
    }

    try {
      console.log(`[UPDATE] Atualizando coluna ${columnId} no board ${boardId}`);
      await this.makeGraphQLRequest(mutation);
    } catch (error) {
      console.error(`[UPDATE] Erro ao atualizar coluna ${columnId} no board ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Formata um valor para update no Monday.com
   * Diferentes tipos de colunas requerem formatos diferentes
   * IMPORTANTE: Pode retornar uma Promise para campos que precisam de resoluÃ§Ã£o assÃ­ncrona
   */
  private formatValueForMondayUpdate(columnId: string, value: any): any | Promise<any> {
    // Se jÃ¡ Ã© uma string vazia, retornar string vazia
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    // Para people (pessoas__1, pessoas5__1, pessoas7, etc)
    if (columnId.startsWith('pessoas')) {
      // Se jÃ¡ vem no formato correto { personsAndTeams: [...] }, retornar diretamente
      if (typeof value === 'object' && value.personsAndTeams && Array.isArray(value.personsAndTeams)) {
        console.log(`[FORMAT] Pessoas jÃ¡ no formato correto:`, JSON.stringify(value));
        return value;
      }

      // CORREÃ‡ÃƒO: Se value Ã© um nome (nÃ£o Ã© nÃºmero), tentar resolver para ID via subscribers
      const resolvePersonIds = async (values: any[]): Promise<string[]> => {
        const resolved: string[] = [];
        for (const val of values) {
          const trimmed = String(val).trim();
          if (!trimmed) continue;
          
          // Se jÃ¡ Ã© um nÃºmero, usar diretamente
          if (/^\d+$/.test(trimmed)) {
            resolved.push(trimmed);
          } else {
            // Ã‰ um nome/email, buscar ID na tabela subscribers
            const subscriber = await this.subscriberRepository.findOne({ 
              where: [{ email: trimmed }, { name: trimmed }] 
            });
            if (subscriber?.id) {
              resolved.push(String(subscriber.id));
            } else {
              console.warn(`[UPDATE] Subscriber nÃ£o encontrado para: ${trimmed}`);
            }
          }
        }
        return resolved;
      };
      
      const values = typeof value === 'string' ? value.split(',').filter(Boolean) : (Array.isArray(value) ? value : [value]);
      if (values.length === 0) {
        return '';
      }
      
      // IMPORTANTE: Retornar uma Promise que serÃ¡ resolvida antes do envio
      return resolvePersonIds(values).then(ids => ({
        personsAndTeams: ids.map(id => ({id: String(id), kind: "person"}))
      }));
    }

    // Para board_relation (conectar_quadros, link_to_itens_filhos, etc)
    if (columnId.includes('conectar_quadros') || columnId.includes('link_to_itens') || columnId.includes('board_relation')) {
      // CORREÃ‡ÃƒO: Se value Ã© um nome (nÃ£o Ã© nÃºmero), tentar resolver para ID
      const resolveIds = async (values: any[]): Promise<number[]> => {
        const resolved: number[] = [];
        // Determinar qual board de taxonomia procurar baseado no column ID
        const targetBoardId = this.RELATION_TO_TARGET_BOARD[columnId];
        
        for (const val of values) {
          const trimmed = String(val).trim();
          if (!trimmed) continue;
          
          // Se jÃ¡ Ã© um nÃºmero, usar diretamente
          if (/^\d+$/.test(trimmed)) {
            resolved.push(Number(trimmed));
          } else {
            // Ã‰ um nome, buscar ID na tabela monday_items
            // Se conhecemos o board alvo, filtrar por ele para melhor precisÃ£o
            const whereClause = targetBoardId 
              ? { name: trimmed, board_id: targetBoardId }
              : { name: trimmed };
            
            const item = await this.mondayItemRepository.findOne({ where: whereClause });
            if (item?.item_id) {
              resolved.push(Number(item.item_id));
            } else {
              console.warn(`[UPDATE] Item nÃ£o encontrado para nome: ${trimmed}${targetBoardId ? ` no board ${targetBoardId}` : ''}`);
            }
          }
        }
        return resolved;
      };
      
      const values = typeof value === 'string' ? value.split(',').filter(Boolean) : (Array.isArray(value) ? value : [value]);
      if (values.length === 0) {
        return '';
      }
      
      // IMPORTANTE: Retornar uma Promise que serÃ¡ resolvida antes do envio
      return resolveIds(values).then(ids => ({
        item_ids: ids
      }));
    }

    // Para timeline (timerange_mkrmvz3)
    if (columnId.startsWith('timerange')) {
      // Se jÃ¡ Ã© objeto com from e to, retornar direto
      if (typeof value === 'object' && value.from && value.to) {
        return { from: value.from, to: value.to };
      }
      // Se Ã© string no formato "YYYY-MM-DD - YYYY-MM-DD", parsear
      if (typeof value === 'string' && value.includes(' - ')) {
        const [from, to] = value.split(' - ').map(s => s.trim());
        return { from, to };
      }
      // Se Ã© string no formato "YYYY-MM-DD,YYYY-MM-DD", parsear
      if (typeof value === 'string' && value.includes(',')) {
        const [from, to] = value.split(',').map(s => s.trim());
        return { from, to };
      }
      return value;
    }

    // Para date (data__1, data76, date_mkr6nj1f, etc)
    if (columnId.startsWith('data') || columnId.startsWith('date_')) {
      // Se value jÃ¡ Ã© um objeto {date: "..."}, extrair apenas a data
      if (typeof value === 'object' && value.date) {
        return { date: value.date };
      }
      return { date: value };
    }

    // Para nÃºmeros (n_mero, n_meros, numeric_)
    if (columnId.startsWith('n_mero') || columnId.startsWith('numeric_')) {
      return String(value);
    }

    // Para seleÃ§Ã£o mÃºltipla (tags) - VERIFICAR ANTES de dropdown simples!
    // lista_suspensa53__1 Ã© o campo de Gatilhos (tags mÃºltiplas)
    if (columnId === 'lista_suspensa53__1' || columnId.includes('sele__o_m_ltipla')) {
      // Se Ã© string com vÃ­rgulas, converter para array
      if (typeof value === 'string') {
        return { labels: value.split(',').map(s => s.trim()).filter(Boolean) };
      }
      // Se jÃ¡ Ã© array, retornar como labels
      if (Array.isArray(value)) {
        return { labels: value };
      }
      // Se jÃ¡ vem no formato { labels: [...] }, retornar direto
      if (typeof value === 'object' && value.labels && Array.isArray(value.labels)) {
        return value;
      }
      return value;
    }

    // Para dropdown/status - alguns esperam apenas string, outros esperam objeto
    if (columnId.startsWith('lista_suspensa') || columnId.startsWith('dropdown_') || columnId === 'status') {
      // CORREÃ‡ÃƒO: Para dropdowns simples, retornar apenas a string do label
      // Monday API espera apenas o nome do label como string para change_simple_column_value
      if (typeof value === 'string') {
        // Remover aspas duplas se existirem
        return value.replace(/^"|"$/g, '');
      }
      // Se Ã© array, pegar primeiro valor (dropdowns simples sÃ³ aceitam 1 valor)
      if (Array.isArray(value)) {
        const cleanValue = String(value[0]).replace(/^"|"$/g, '');
        return cleanValue;
      }
      // Se Ã© objeto com label, extrair label
      if (typeof value === 'object' && value.label) {
        return value.label;
      }
      return String(value);
    }

    // Para checkbox/color (color_mkrm8t9t, color_mkrn99jy)
    if (columnId.startsWith('color_')) {
      return String(value);
    }

    // Para lookup/mirror - geralmente sÃ£o read-only, mas aceitar como text
    if (columnId.startsWith('lookup_')) {
      return String(value);
    }

    // Para text e long_text - retornar direto
    if (columnId.startsWith('text_') || columnId.startsWith('long_text_') ||
        columnId.startsWith('texto') || columnId.startsWith('texto_')) {
      return String(value);
    }

    // Default: retornar o valor como estÃ¡
    return value;
  }
}
