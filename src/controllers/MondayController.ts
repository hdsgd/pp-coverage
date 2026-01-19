import { Request, Response } from "express";
import { MondayService } from "../services/MondayService";
import { CreateMondayBoardDto, UpdateMondayBoardDto } from "../dto/MondayBoardDto";
import { SyncMondayDataDto } from "../dto/MondayItemDto";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

export class MondayController {
  private readonly mondayService: MondayService;

  constructor() {
    this.mondayService = new MondayService();
  }

  // GET /api/v1/monday/boards - Listar todos os boards configurados
  async getAllBoards(_req: Request, res: Response): Promise<void> {
    try {
      const boards = await this.mondayService.getAllBoards();
      res.json({
        success: true,
        data: boards,
        message: "Boards recuperados com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao recuperar boards",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // POST /api/v1/monday/boards - Criar um novo board
  async createBoard(req: Request, res: Response): Promise<void> {
    try {
      const createBoardDto = plainToClass(CreateMondayBoardDto, req.body);
      const errors = await validate(createBoardDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: errors.map(error => Object.values(error.constraints || {})).flat()
        });
        return;
      }

      const board = await this.mondayService.createBoard(createBoardDto);
      res.status(201).json({
        success: true,
        data: board,
        message: "Board criado com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao criar board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // PUT /api/v1/monday/boards/:id - Atualizar um board
  async updateBoard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateBoardDto = plainToClass(UpdateMondayBoardDto, req.body);
      const errors = await validate(updateBoardDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: errors.map(error => Object.values(error.constraints || {})).flat()
        });
        return;
      }

      const board = await this.mondayService.updateBoard(id, updateBoardDto);
      res.json({
        success: true,
        data: board,
        message: "Board atualizado com sucesso"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Board não encontrado") {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Erro ao atualizar board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // DELETE /api/v1/monday/boards/:id - Deletar um board
  async deleteBoard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.mondayService.deleteBoard(id);
      res.json({
        success: true,
        message: "Board deletado com sucesso"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Board não encontrado") {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Erro ao deletar board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/boards/:id/items - Listar itens de um board específico
  async getBoardItems(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Primeiro, busca o board pelo ID interno (UUID) para obter o board_id
      const board = await this.mondayService.getBoardById(id);
      if (!board) {
        res.status(404).json({
          success: false,
          message: "Board não encontrado"
        });
        return;
      }
      
      // Agora busca os itens usando o board_id (ID do Monday.com)
      const items = await this.mondayService.getItemsByBoard(board.id);
      
      // Mapeia os itens para retornar informações completas
      const simplifiedItems = items.map(item => ({
        id: item.id,
        item_id: item.item_id,
        name: item.name,
        status: item.status,
        max_value: item.max_value,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
      
      res.json({
        success: true,
        data: simplifiedItems,
        total_items: items.length, // Adicionar contador total
        message: "Itens recuperados com sucesso",
        board_info: {
          id: board.id,
          name: board.name,
          board_id: board.board_id
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao recuperar itens do board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/boards/monday-id/:board_id/items - Listar itens usando board_id do Monday.com
  async getBoardItemsByMondayId(req: Request, res: Response): Promise<void> {
    try {
      const { board_id } = req.params;
      
      // Primeiro, busca o board pelo board_id do Monday.com
      const board = await this.mondayService.getBoardByMondayId(board_id);
      if (!board) {
        res.status(404).json({
          success: false,
          message: "Board não encontrado"
        });
        return;
      }
      
      // Agora busca os itens usando o ID interno do board
      const items = await this.mondayService.getItemsByBoard(board.id);
      
      // Cria um objeto onde name é a chave e item_id é o valor
      const itemsData: { [key: string]: string } = {};
      items.forEach(item => {
        itemsData[item.name] = item.item_id;
      });
      
      res.json({
        board_info: {
          id: board.id,
          name: board.name,
          board_id: board.board_id
        },
        data: itemsData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao recuperar itens do board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // POST /api/v1/monday/sync - Sincronizar dados do Monday
  async syncData(req: Request, res: Response): Promise<void> {
    try {
      const syncDto = plainToClass(SyncMondayDataDto, req.body);
      const errors = await validate(syncDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: errors.map(error => Object.values(error.constraints || {})).flat()
        });
        return;
      }

      await this.mondayService.syncBoardData();
      res.json({
        success: true,
        message: "Sincronização realizada com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao sincronizar dados",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // POST /api/v1/monday/sync/:boardId - Sincronizar dados de um board específico
  async syncBoardData(req: Request, res: Response): Promise<void> {
    try {
      const { boardId } = req.params;
      await this.mondayService.syncBoardData(boardId);
      res.json({
        success: true,
        message: "Sincronização do board realizada com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao sincronizar dados do board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // POST /api/v1/monday/sync-board/:id - Sincronizar board específico pelo ID do banco
  async syncBoardById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.mondayService.syncBoardById(id);
      
      res.json({
        success: result.success,
        message: result.message,
        data: {
          itemsCount: result.itemsCount
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("não encontrado")) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Erro ao sincronizar board específico",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // POST /api/v1/monday/initialize - Inicializar boards padrão
  async initializeBoards(_req: Request, res: Response): Promise<void> {
    try {
      await this.mondayService.initializeDefaultBoards();
      res.json({
        success: true,
        message: "Boards padrão inicializados com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao inicializar boards padrão",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/items - Listar todos os itens ativos
  async getAllActiveItems(_req: Request, res: Response): Promise<void> {
    try {
      const items = await this.mondayService.getAllActiveItems();
      res.json({
        success: true,
        data: items,
        message: "Itens ativos recuperados com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao recuperar itens ativos",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/board-info/:boardId - Buscar informações de um board do Monday
  async getBoardInfo(req: Request, res: Response): Promise<void> {
    try {
      const { boardId } = req.params;
      const boardInfo = await this.mondayService.getBoardInfo(boardId);
      
      if (!boardInfo) {
        res.status(404).json({
          success: false,
          message: "Board não encontrado no Monday.com"
        });
        return;
      }
      
      res.json({
        success: true,
        data: boardInfo,
        message: "Informações do board recuperadas com sucesso"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao recuperar informações do board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/test-connection - Testar conexão com Monday.com
  async testConnection(_req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await this.mondayService.testConnection();
      
      if (isConnected) {
        res.json({
          success: true,
          message: "Conexão com Monday.com estabelecida com sucesso"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Falha na conexão com Monday.com"
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao testar conexão",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // POST /api/v1/monday/sync-board-by-id/:id - Sincronizar board específico e salvar itens
  async syncBoardByDatabaseId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.mondayService.syncBoardByDatabaseId(id);
      
      res.json({
        success: true,
        message: result.message,
        data: {
          itemsCount: result.itemsCount,
          boardName: result.boardName
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("não encontrado")) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Erro ao sincronizar board",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/channel-schedules/:channelName/:date - Buscar schedules por nome do canal e data
  async getChannelSchedulesByNameAndDate(req: Request, res: Response): Promise<void> {
    try {
      const { channelName, date, areaSolicitante, contexto } = req.query;

      // Validação básica dos parâmetros
      if (!channelName || !date) {
        res.status(400).json({
          success: false,
          message: "Nome do canal e data são obrigatórios"
        });
        return;
      }

      // Validação do formato da data
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date as string)) {
        res.status(400).json({
          success: false,
          message: "Formato de data inválido. Use DD/MM/YYYY ou YYYY-MM-DD"
        });
        return;
      }

      // Validar contexto se fornecido
      if (contexto && contexto !== 'form' && contexto !== 'admin') {
        res.status(400).json({
          success: false,
          message: "Contexto inválido. Use 'form' ou 'admin'"
        });
        return;
      }

      const result = await this.mondayService.getChannelSchedulesByNameAndDate(
        channelName as string,
        date as string,
        areaSolicitante as string | undefined,
        (contexto as 'form' | 'admin' | undefined) || 'admin'  // Default: admin (mais restritivo)
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar schedules",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/debug/board/:board_id/items-count - Debug: Contar itens por board
  async debugBoardItemsCount(req: Request, res: Response): Promise<void> {
    try {
      const { board_id } = req.params;
      
      // Busca o board
      const board = await this.mondayService.getBoardByMondayId(board_id);
      if (!board) {
        res.status(404).json({
          success: false,
          message: "Board não encontrado"
        });
        return;
      }
      
      // Conta os itens de diferentes formas
      const itemsCount = await this.mondayService.getItemsCountByBoard(board.id);
      const allItems = await this.mondayService.getItemsByBoard(board.id);
      
      res.json({
        success: true,
        data: {
          board_info: {
            id: board.id,
            name: board.name,
            board_id: board.board_id
          },
          count_method: itemsCount,
          find_method_length: allItems.length,
          sample_items: allItems.slice(0, 5).map(item => ({
            id: item.id,
            name: item.name,
            status: item.status
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro no debug",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/campaigns - Listar campanhas do board principal com paginação
  async getCampaignsPaginated(req: Request, res: Response): Promise<void> {
    try {
      const { cursor, dateFrom, dateTo, searchTerm } = req.query;

      const result = await this.mondayService.getCampaignsPaginated(
        cursor as string | undefined,
        dateFrom as string | undefined,
        dateTo as string | undefined,
        searchTerm as string | undefined
      );

      res.json({
        success: true,
        data: result.items,
        cursor: result.cursor,
        hasMore: result.hasMore,
        count: result.items.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar campanhas",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // GET /api/v1/monday/campaigns/:id - Buscar detalhes de uma campanha específica
  async getCampaignDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "ID da campanha é obrigatório"
        });
        return;
      }

      const result = await this.mondayService.getCampaignDetails(id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('não encontrada') || error.message.includes('não pertence')) {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Erro ao buscar detalhes da campanha",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  // PATCH /api/v1/monday/campaigns/:id - Atualizar uma campanha existente
  async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const formData = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "ID da campanha é obrigatório"
        });
        return;
      }

      console.log(`[UPDATE] Iniciando atualização da campanha ${id}`);
      console.log(`[UPDATE] Dados recebidos:`, Object.keys(formData));

      const result = await this.mondayService.updateCampaign(id, formData);

      res.json({
        success: true,
        message: "Campanha atualizada com sucesso",
        data: result
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('não encontrada') || error.message.includes('não pertence')) {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Erro ao atualizar campanha",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }
}
