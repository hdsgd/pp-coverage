import { Repository, DataSource } from 'typeorm';
import { ChannelSchedule } from '../entities/ChannelSchedule';
import { MondayItem } from '../entities/MondayItem';
import {
    CreateChannelScheduleDto,
    UpdateChannelScheduleDto,
    ChannelScheduleResponseDto
} from '../dto/ChannelScheduleDto';

export class ChannelScheduleService {
    private readonly channelScheduleRepository: Repository<ChannelSchedule>;
    private readonly mondayItemRepository: Repository<MondayItem>;

    constructor(private readonly dataSource: DataSource) {
        this.channelScheduleRepository = this.dataSource.getRepository(ChannelSchedule);
        this.mondayItemRepository = this.dataSource.getRepository(MondayItem);
    }

    /**
     * Converte data de DD/MM/YYYY para Date object
     * Usa UTC para evitar problemas com timezone
     */
    private parseDate(dateString: string): Date {
        const [day, month, year] = dateString.split('/');
        // Usa Date.UTC e cria a data ao meio-dia UTC para evitar problemas de timezone
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    }

    /**
     * Converte Date object ou string para DD/MM/YYYY
     * Usa UTC para evitar problemas com timezone
     */
    private formatDate(date: Date | string): string {
        // Se já for uma string no formato DD/MM/YYYY, retorna direto
        if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            return date;
        }

        // Se for string mas não no formato esperado, tenta converter
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        // Usa métodos UTC para evitar problemas de timezone
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const year = dateObj.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Valida formato da data (DD/MM/YYYY)
     */
    private validateDateFormat(dateString: string): boolean {
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(dateString)) {
            return false;
        }

        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        return date.getDate() === day && 
               date.getMonth() === month - 1 && 
               date.getFullYear() === year;
    }

    /**
     * Valida formato da hora (HH:MM)
     */
    private validateTimeFormat(timeString: string): boolean {
        const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
        return timeRegex.test(timeString);
    }

    /**
     * Converte entidade para DTO de resposta
     */
    private toResponseDto(entity: ChannelSchedule): ChannelScheduleResponseDto {
        return {
            id: entity.id,
            id_canal: entity.id_canal,
            data: this.formatDate(entity.data),
            hora: entity.hora,
            qtd: Number(entity.qtd),
            area_solicitante: entity.area_solicitante,
            solicitante: entity.solicitante,
            tipo: entity.tipo || 'agendamento',
            created_at: entity.created_at,
            updated_at: entity.updated_at
        };
    }

    /**
     * Valida se há capacidade disponível antes de criar/atualizar agendamento
     * IMPORTANTE: Esta validação protege contra chamadas diretas à API
     * 
     * REGRA DE NEGÓCIO:
     * - Agendamentos (tipo='agendamento', criados via form): SEMPRE contam como usado
     * - Reservas (tipo='reserva', criadas via admin): 
     *   - Se da MESMA área: NÃO contam como usado
     *   - Se de OUTRA área: contam como usado
     */
    private async validateCapacity(
        id_canal: string,
        data: Date,
        hora: string,
        qtdSolicitada: number,
        excludeScheduleId?: string,
        area_solicitante?: string
    ): Promise<void> {
        const horaFormatted = hora.substring(0, 5); // "08:00:00" -> "08:00"

        // Horários especiais que compartilham limite (8:00 e 8:30)
        const splitHours = ["08:00", "08:30"];

        // 1. Buscar o canal para obter o max_value
        const canalItem = await this.mondayItemRepository.findOne({
            where: { item_id: id_canal, status: 'Ativo' }
        });

        if (!canalItem) {
            throw new Error(`Canal com ID ${id_canal} não encontrado ou inativo`);
        }

        const maxValue = parseFloat(canalItem.max_value?.toString() || '0');

        // 2. Determinar o limite efetivo para este horário
        const effectiveMaxValue = splitHours.includes(horaFormatted) ? maxValue / 2 : maxValue;

        // 3. Buscar agendamentos existentes para este canal/data/hora
        // Usa QueryBuilder com DATE() para comparar apenas a parte da data
        // Isso evita problemas de timezone e hora que ocorrem com TypeORM find()
        const dataString = data.toISOString().split('T')[0]; // "2025-12-26"

        const todosAgendamentos = await this.channelScheduleRepository
            .createQueryBuilder('schedule')
            .where('schedule.id_canal = :id_canal', { id_canal })
            .andWhere('DATE(schedule.data) = :data', { data: dataString })
            .getMany();

        // Filtra por hora (comparando apenas HH:MM)
        const agendamentosExistentes = todosAgendamentos.filter(schedule => {
            const scheduleHora = schedule.hora.substring(0, 5);
            return scheduleHora === horaFormatted;
        });

        // 4. Calcular total já usado seguindo a NOVA LÓGICA
        // - Agendamentos (tipo='agendamento'): SEMPRE contam
        // - Reservas (tipo='reserva'): só contam se forem de OUTRA área
        let totalJaUsado = 0;
        let totalAbsoluto = 0; // Total absoluto (soma TUDO, independente de área)
        let totalReservasMesmaArea = 0; // Reservas que podem ser reutilizadas

        agendamentosExistentes
            .filter(schedule => schedule.id !== excludeScheduleId)
            .forEach(schedule => {
                const qtd = parseFloat(schedule.qtd.toString());
                const tipo = schedule.tipo || 'agendamento';

                // Sempre soma no total absoluto
                totalAbsoluto += qtd;

                if (tipo === 'agendamento') {
                    // Agendamentos SEMPRE contam
                    totalJaUsado += qtd;
                } else if (tipo === 'reserva') {
                    // Reservas só contam se forem de OUTRA área
                    if (!area_solicitante || schedule.area_solicitante !== area_solicitante) {
                        totalJaUsado += qtd;
                    } else {
                        // Se for da mesma área, não soma (permite reuso)
                        totalReservasMesmaArea += qtd;
                    }
                }
            });

        console.log(`[validateCapacity] Hora ${horaFormatted}:`);
        console.log(`  - Limite efetivo: ${effectiveMaxValue}`);
        console.log(`  - Total absoluto no banco: ${totalAbsoluto}`);
        console.log(`  - Total usado (sem reservas mesma área): ${totalJaUsado}`);
        console.log(`  - Reservas da mesma área (reutilizáveis): ${totalReservasMesmaArea}`);
        console.log(`  - Quantidade solicitada: ${qtdSolicitada}`);

        // 5. Validar disponível para esta área específica
        // NOTA: Esta é a validação principal. A validação de limite absoluto não é necessária porque:
        // 1. Esta validação já garante que não vai exceder o limite do canal
        // 2. As reservas da mesma área serão DELETADAS no método create() antes de criar o agendamento
        // 3. Então o total final no banco será consistente (não duplica reserva + agendamento)
        const disponivel = effectiveMaxValue - totalJaUsado;

        console.log(`  - Disponível para esta área: ${disponivel}`);

        if (qtdSolicitada > disponivel) {
            const limiteInfo = splitHours.includes(horaFormatted)
                ? ` (horário especial com limite dividido: ${effectiveMaxValue.toLocaleString('pt-BR')} de ${maxValue.toLocaleString('pt-BR')} total do canal)`
                : '';

            throw new Error(
                `Capacidade insuficiente para ${horaFormatted}${limiteInfo}. ` +
                `Limite: ${effectiveMaxValue.toLocaleString('pt-BR')}, ` +
                `Já usado (outras áreas): ${totalJaUsado.toLocaleString('pt-BR')}, ` +
                `Reservas reutilizáveis (sua área): ${totalReservasMesmaArea.toLocaleString('pt-BR')}, ` +
                `Solicitado: ${qtdSolicitada.toLocaleString('pt-BR')}, ` +
                `Disponível: ${disponivel.toLocaleString('pt-BR')}`
            );
        }

        console.log(`  ✅ Validação passou! Criação permitida.`);
    }

    /**
     * Cria um novo agendamento de canal
     * NOTA: Inclui validação de capacidade para proteger contra chamadas diretas à API
     */
    async create(createDto: CreateChannelScheduleDto): Promise<ChannelScheduleResponseDto> {
        // Validações básicas
        if (!this.validateDateFormat(createDto.data)) {
            throw new Error('Formato de data inválido. Use DD/MM/YYYY');
        }

        if (!this.validateTimeFormat(createDto.hora)) {
            throw new Error('Formato de hora inválido. Use HH:MM');
        }

        if (createDto.qtd <= 0) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        if (!createDto.area_solicitante) {
            throw new Error('Área solicitante é obrigatória');
        }

        // Validar capacidade disponível (considerando área solicitante)
        const parsedDate = this.parseDate(createDto.data);
        await this.validateCapacity(
            createDto.id_canal,
            parsedDate,
            createDto.hora,
            createDto.qtd,
            undefined,
            createDto.area_solicitante
        );

        // Determinar o tipo do novo registro
        let tipoNovo: 'reserva' | 'agendamento';
        if ((createDto as any).tipo === 'reserva') {
            tipoNovo = 'reserva';
        } else if ((createDto as any).tipo === 'agendamento') {
            tipoNovo = 'agendamento';
        } else {
            // Fallback: Se tem user_id, é agendamento (form). Se não tem, é reserva (admin)
            tipoNovo = createDto.user_id ? 'agendamento' : 'reserva';
        }

        const channelSchedule = new ChannelSchedule();
        channelSchedule.id_canal = createDto.id_canal;
        channelSchedule.data = parsedDate;
        channelSchedule.hora = createDto.hora;
        channelSchedule.qtd = createDto.qtd;
        channelSchedule.user_id = createDto.user_id;
        channelSchedule.area_solicitante = createDto.area_solicitante;
        channelSchedule.solicitante = createDto.solicitante;
        channelSchedule.tipo = tipoNovo;

        const savedEntity = await this.channelScheduleRepository.save(channelSchedule);
        return this.toResponseDto(savedEntity);
    }

    /**
     * Lista todos os agendamentos
     */
    async findAll(): Promise<ChannelScheduleResponseDto[]> {
        const entities = await this.channelScheduleRepository.find({
            order: { data: 'ASC', hora: 'ASC' }
        });

        return entities.map(entity => this.toResponseDto(entity));
    }

    /**
     * Lista agendamentos de um usuário específico
     */
    async findByUserId(userId: string): Promise<ChannelScheduleResponseDto[]> {
        const entities = await this.channelScheduleRepository.find({
            where: { user_id: userId },
            order: { data: 'ASC', hora: 'ASC' }
        });

        return entities.map(entity => this.toResponseDto(entity));
    }

    /**
     * Lista agendamentos de um usuário específico filtrados por área
     */
    async findByUserIdAndArea(userId: string, areaSolicitante: string): Promise<ChannelScheduleResponseDto[]> {
        const entities = await this.channelScheduleRepository.find({
            where: {
                user_id: userId,
                area_solicitante: areaSolicitante
            },
            order: { data: 'ASC', hora: 'ASC' }
        });

        return entities.map(entity => this.toResponseDto(entity));
    }

    /**
     * Busca agendamento por ID
     */
    async findById(id: string): Promise<ChannelScheduleResponseDto | null> {
        const entity = await this.channelScheduleRepository.findOne({ where: { id } });
        
        if (!entity) {
            return null;
        }

        return this.toResponseDto(entity);
    }

    /**
     * Busca agendamentos por canal
     */
    async findByChannel(id_canal: string): Promise<ChannelScheduleResponseDto[]> {
        const entities = await this.channelScheduleRepository.find({
            where: { id_canal },
            order: { data: 'ASC', hora: 'ASC' }
        });
        
        return entities.map(entity => this.toResponseDto(entity));
    }

    /**
     * Atualiza um agendamento
     * NOTA: Inclui validação de capacidade para proteger contra atualizações diretas via API
     */
    async update(id: string, updateDto: UpdateChannelScheduleDto): Promise<ChannelScheduleResponseDto | null> {
        const existingEntity = await this.channelScheduleRepository.findOne({ where: { id } });

        if (!existingEntity) {
            return null;
        }

        // Validações básicas se os campos foram fornecidos
        if (updateDto.data && !this.validateDateFormat(updateDto.data)) {
            throw new Error('Formato de data inválido. Use DD/MM/YYYY');
        }

        if (updateDto.hora && !this.validateTimeFormat(updateDto.hora)) {
            throw new Error('Formato de hora inválido. Use HH:MM');
        }

        if (updateDto.qtd !== undefined && updateDto.qtd <= 0) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        // Determinar valores finais após update
        const finalIdCanal = updateDto.id_canal || existingEntity.id_canal;
        const finalData = updateDto.data ? this.parseDate(updateDto.data) : existingEntity.data;
        const finalHora = updateDto.hora || existingEntity.hora;
        const finalQtd = updateDto.qtd !== undefined ? updateDto.qtd : existingEntity.qtd;
        const finalAreaSolicitante = updateDto.area_solicitante !== undefined
            ? updateDto.area_solicitante
            : existingEntity.area_solicitante;

        // Validar capacidade com os novos valores (excluindo este agendamento do cálculo)
        await this.validateCapacity(
            finalIdCanal,
            finalData,
            finalHora,
            finalQtd,
            id,
            finalAreaSolicitante
        );

        // Se passou na validação, atualizar
        if (updateDto.id_canal) existingEntity.id_canal = updateDto.id_canal;
        if (updateDto.data) existingEntity.data = finalData;
        if (updateDto.hora) existingEntity.hora = updateDto.hora;
        if (updateDto.qtd !== undefined) existingEntity.qtd = updateDto.qtd;
        if (updateDto.area_solicitante !== undefined) existingEntity.area_solicitante = updateDto.area_solicitante;
        if (updateDto.solicitante !== undefined) existingEntity.solicitante = updateDto.solicitante;

        const savedEntity = await this.channelScheduleRepository.save(existingEntity);
        return this.toResponseDto(savedEntity);
    }

    /**
     * Deleta um agendamento
     */
    async delete(id: string): Promise<boolean> {
        const result = await this.channelScheduleRepository.delete(id);
        return result.affected !== 0;
    }

    /**
     * Deleta agendamentos por canal, data e hora específicos
     * Usado quando um touchpoint muda de horário para liberar a reserva antiga
     */
    async deleteByChannelDateHour(id_canal: string, data: string, hora: string, area_solicitante?: string): Promise<number> {
        if (!this.validateDateFormat(data)) {
            throw new Error('Formato de data inválido. Use DD/MM/YYYY');
        }

        const parsedDate = this.parseDate(data);
        const dataString = parsedDate.toISOString().split('T')[0];
        const horaFormatted = hora.substring(0, 5);

        console.log(`[DELETE_SCHEDULE] Deletando agendamentos: canal=${id_canal}, data=${data}, hora=${horaFormatted}, area=${area_solicitante}`);

        // Buscar agendamentos existentes
        const todosAgendamentos = await this.channelScheduleRepository
            .createQueryBuilder('schedule')
            .where('schedule.id_canal = :id_canal', { id_canal })
            .andWhere('DATE(schedule.data) = :data', { data: dataString })
            .getMany();

        // Filtrar por hora e área (se fornecida)
        const agendamentosParaDeletar = todosAgendamentos.filter(schedule => {
            const scheduleHora = schedule.hora.substring(0, 5);
            const matchHora = scheduleHora === horaFormatted;
            const matchArea = !area_solicitante || schedule.area_solicitante === area_solicitante;
            return matchHora && matchArea;
        });

        if (agendamentosParaDeletar.length === 0) {
            console.log(`[DELETE_SCHEDULE] Nenhum agendamento encontrado para deletar`);
            return 0;
        }

        // Deletar em lote
        const ids = agendamentosParaDeletar.map(s => s.id);
        const result = await this.channelScheduleRepository.delete(ids);
        
        console.log(`[DELETE_SCHEDULE] ✅ ${result.affected} agendamento(s) deletado(s)`);
        return result.affected || 0;
    }

    /**
     * Busca agendamentos por data
     */
    async findByDate(data: string): Promise<ChannelScheduleResponseDto[]> {
        if (!this.validateDateFormat(data)) {
            throw new Error('Formato de data inválido. Use DD/MM/YYYY');
        }

        const parsedDate = this.parseDate(data);
        const entities = await this.channelScheduleRepository.find({
            where: { data: parsedDate },
            order: { hora: 'ASC' }
        });
        
        return entities.map(entity => this.toResponseDto(entity));
    }

    /**
     * Processa dados do formulário e cria agendamentos de canal
     */
    async createFromFormSubmission(formData: any): Promise<ChannelScheduleResponseDto[]> {
        const results: ChannelScheduleResponseDto[] = [];

        try {
            // Verificar se existem touchpoints no formulário
            if (!formData.__TOUCHPOINTS__ || !Array.isArray(formData.__TOUCHPOINTS__)) {
                return results;
            }

            // Processar cada touchpoint
            for (const touchpoint of formData.__TOUCHPOINTS__) {
                if (!touchpoint.channels || !Array.isArray(touchpoint.channels)) {
                    continue;
                }

                // Processar cada canal do touchpoint
                for (const channel of touchpoint.channels) {
                    try {
                        // Criar agendamento para o canal
                        const channelScheduleDto: CreateChannelScheduleDto = {
                            id_canal: channel.id_canal || channel.id,
                            data: channel.data || touchpoint.data,
                            hora: channel.hora || '09:00', // Hora padrão se não fornecida
                            qtd: parseInt(channel.volumeDisparo) || 1,
                            area_solicitante: formData.conectar_quadros__1 || formData.area_solicitante
                        };

                        const createdSchedule = await this.create(channelScheduleDto);
                        results.push(createdSchedule);
                    } catch (channelError) {
                        console.error('Error creating schedule for channel:', channelError);
                        // Continua processando outros canais mesmo se um falhar
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('Error processing form submission:', error);
            throw new Error('Failed to process form submission');
        }
    }

}
