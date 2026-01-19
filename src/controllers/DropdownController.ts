import { Request, Response } from "express";
import { MondayService } from "../services/MondayService";

export class DropdownController {
  private readonly mondayService: MondayService;

  constructor() {
    this.mondayService = new MondayService();
  }

  // GET /api/v1/dropdown-options/:fieldId - Buscar opções de dropdown por field ID
  async getDropdownOptions(req: Request, res: Response): Promise<void> {
    try {
      const { fieldId } = req.params;
      
      if (!fieldId) {
        res.status(400).json({
          success: false,
          message: "Field ID é obrigatório"
        });
        return;
      }

      // Busca as opções do campo no Monday.com
      const options = await this.mondayService.getFieldOptions(fieldId);
      
      res.json({
        success: true,
        options: options,
        total: options.length,
        fieldId: fieldId
      });

    } catch (error) {
      console.error('Erro ao buscar opções do dropdown:', error);
      res.status(500).json({
        success: false,
        message: "Erro ao buscar opções do dropdown",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }
}
