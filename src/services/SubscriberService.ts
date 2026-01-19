import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Subscriber } from '../entities/Subscriber';
import { SubscriberResponseDto, SubscriberDropdownOption } from '../dto/SubscriberDto';
import { MondayService } from './MondayService';

export class SubscriberService {
    private readonly subscriberRepository: Repository<Subscriber>;
    private readonly mondayService: MondayService;
    private readonly BOARD_ID = '7463706726'; // ID fixo do board conforme especificado

    constructor() {
        this.subscriberRepository = AppDataSource.getRepository(Subscriber);
        this.mondayService = new MondayService();
    }

    /**
     * Busca subscribers do Monday.com e armazena em cache local
     */
    async syncSubscribersFromMonday(): Promise<SubscriberResponseDto[]> {
        try {
            const query = `
                query {
                    boards(ids: ${this.BOARD_ID}) {
                        subscribers {
                            id
                            name
                            email
                        }
                    }
                }
            `;

            const response = await this.mondayService.makeGraphQLRequest(query);
            
            if (!response.data?.boards?.[0]?.subscribers) {
                throw new Error('Nenhum subscriber encontrado no board');
            }

            const subscribers = response.data.boards[0].subscribers;
            const savedSubscribers: SubscriberResponseDto[] = [];

            // Processar e salvar cada subscriber
            for (const subscriberData of subscribers) {
                const savedSubscriber = await this.upsertSubscriber({
                    id: subscriberData.id,
                    name: subscriberData.name,
                    email: subscriberData.email,
                    board_id: this.BOARD_ID
                });
                
                savedSubscribers.push(savedSubscriber);
            }

            return savedSubscribers;
        } catch (error) {
            console.error('Erro ao sincronizar subscribers:', error);
            throw new Error('Falha ao sincronizar subscribers do Monday.com');
        }
    }

    /**
     * Insere ou atualiza um subscriber
     */
    private async upsertSubscriber(subscriberData: {
        id: string;
        name: string;
        email: string;
        board_id: string;
    }): Promise<SubscriberResponseDto> {
        // Verificar se o subscriber já existe
        let subscriber = await this.subscriberRepository.findOne({
            where: { id: subscriberData.id }
        });

        if (subscriber) {
            // Atualizar subscriber existente
            subscriber.name = subscriberData.name;
            subscriber.email = subscriberData.email;
            subscriber.board_id = subscriberData.board_id;
        } else {
            // Criar novo subscriber
            subscriber = this.subscriberRepository.create(subscriberData);
        }

        const savedSubscriber = await this.subscriberRepository.save(subscriber);
        return this.toResponseDto(savedSubscriber);
    }

    /**
     * Busca todos os subscribers do cache local
     */
    async getAllSubscribers(): Promise<SubscriberResponseDto[]> {
        const subscribers = await this.subscriberRepository.find({
            order: { name: 'ASC' }
        });

        return subscribers.map(subscriber => this.toResponseDto(subscriber));
    }

    /**
     * Busca subscribers formatados para dropdown
     */
    async getSubscribersForDropdown(): Promise<SubscriberDropdownOption[]> {
        const subscribers = await this.subscriberRepository.find({
            order: { name: 'ASC' }
        });

        return subscribers.map(subscriber => ({
            name: subscriber.name,
            item_id: subscriber.id
        }));
    }

    /**
     * Busca subscriber por ID
     */
    async getSubscriberById(id: string): Promise<SubscriberResponseDto | null> {
        const subscriber = await this.subscriberRepository.findOne({
            where: { id }
        });

        if (!subscriber) {
            return null;
        }

        return this.toResponseDto(subscriber);
    }

    /**
     * Busca subscribers por board ID
     */
    async getSubscribersByBoardId(boardId: string): Promise<SubscriberResponseDto[]> {
        const subscribers = await this.subscriberRepository.find({
            where: { board_id: boardId },
            order: { name: 'ASC' }
        });

        return subscribers.map(subscriber => this.toResponseDto(subscriber));
    }

    /**
     * Força refresh dos dados do Monday.com
     */
    async refreshSubscribers(): Promise<SubscriberResponseDto[]> {
        // Limpar cache atual
        await this.subscriberRepository.clear();
        
        // Buscar dados atualizados
        return this.syncSubscribersFromMonday();
    }

    /**
     * Converte entidade para DTO de resposta
     */
    private toResponseDto(subscriber: Subscriber): SubscriberResponseDto {
        return {
            id: subscriber.id,
            name: subscriber.name,
            email: subscriber.email,
            board_id: subscriber.board_id,
            created_at: subscriber.created_at,
            updated_at: subscriber.updated_at
        };
    }

    /**
     * Verifica se o cache precisa ser atualizado
     */
    async needsSync(): Promise<boolean> {
        const count = await this.subscriberRepository.count();
        
        // Se não há subscribers no cache, precisa sincronizar
        if (count === 0) {
            return true;
        }

        // Verificar se o último update foi há mais de 1 hora (cache TTL)
        // Evitar findOne sem condição (TypeORM exige seleção específica)
        const latestList = await this.subscriberRepository.find({
            order: { updated_at: 'DESC' },
            take: 1
        });
        const latestSubscriber = latestList[0];

        if (!latestSubscriber) {
            return true;
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return latestSubscriber.updated_at < oneHourAgo;
    }
}
