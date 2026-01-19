import { Request, Response } from 'express';
import { SubscriberService } from '../services/SubscriberService';

export class SubscriberController {
    private readonly subscriberService: SubscriberService;

    constructor() {
        this.subscriberService = new SubscriberService();
    }

    /**
     * GET /api/v1/subscribers - Lista todos os subscribers
     */
    async getAllSubscribers(_req: Request, res: Response): Promise<void> {
        try {
            // Verificar se precisa sincronizar
            if (await this.subscriberService.needsSync()) {
                await this.subscriberService.syncSubscribersFromMonday();
            }

            const subscribers = await this.subscriberService.getAllSubscribers();
            
            res.json({
                success: true,
                data: subscribers,
                message: 'Subscribers recuperados com sucesso'
            });
        } catch (error) {
            console.error('Erro ao buscar subscribers:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar subscribers',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/v1/subscribers/dropdown - Lista subscribers formatados para dropdown
     */
    async getSubscribersForDropdown(_req: Request, res: Response): Promise<void> {
        try {
            // Verificar se precisa sincronizar
            if (await this.subscriberService.needsSync()) {
                await this.subscriberService.syncSubscribersFromMonday();
            }

            const subscribers = await this.subscriberService.getSubscribersForDropdown();
            
            res.json({
                success: true,
                data: subscribers,
                message: 'Subscribers para dropdown recuperados com sucesso'
            });
        } catch (error) {
            console.error('Erro ao buscar subscribers para dropdown:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar subscribers para dropdown',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/v1/subscribers/:id - Busca subscriber por ID
     */
    async getSubscriberById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const subscriber = await this.subscriberService.getSubscriberById(id);
            
            if (!subscriber) {
                res.status(404).json({
                    success: false,
                    message: 'Subscriber não encontrado'
                });
                return;
            }

            res.json({
                success: true,
                data: subscriber,
                message: 'Subscriber encontrado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao buscar subscriber por ID:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar subscriber',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /api/v1/subscribers/sync - Força sincronização com Monday.com
     */
    async syncSubscribers(_req: Request, res: Response): Promise<void> {
        try {
            const subscribers = await this.subscriberService.syncSubscribersFromMonday();
            
            res.json({
                success: true,
                data: subscribers,
                message: `${subscribers.length} subscribers sincronizados com sucesso`
            });
        } catch (error) {
            console.error('Erro ao sincronizar subscribers:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao sincronizar subscribers',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /api/v1/subscribers/refresh - Força refresh completo dos dados
     */
    async refreshSubscribers(_req: Request, res: Response): Promise<void> {
        try {
            const subscribers = await this.subscriberService.refreshSubscribers();
            
            res.json({
                success: true,
                data: subscribers,
                message: `Cache limpo e ${subscribers.length} subscribers atualizados`
            });
        } catch (error) {
            console.error('Erro ao fazer refresh dos subscribers:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao fazer refresh dos subscribers',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
