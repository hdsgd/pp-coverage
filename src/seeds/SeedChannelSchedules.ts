import { DataSource } from "typeorm";
import { ChannelSchedule } from "../entities/ChannelSchedule";

export class SeedChannelSchedules {
    public static async run(dataSource: DataSource): Promise<void> {
        const scheduleRepository = dataSource.getRepository(ChannelSchedule);

                // Delete existing data
        await scheduleRepository.query("DELETE FROM channel_schedules");

        // Dados exatos do banco - agora com area_solicitante obrigatória
        // IDs reais das áreas do Monday.com (board 7400348232)
        const schedulesData = [
            // 2025-08-10 - Área "Growth Central - Aquisicao" (ID: 7698259832)
            { id_canal: "7698495864", data: "2025-08-10", hora: "09:00:00", qtd: 25000.00, area_solicitante: "7698259832" },
            { id_canal: "7698495865", data: "2025-08-10", hora: "10:00:00", qtd: 12000.00, area_solicitante: "7698259832" },
            { id_canal: "7698495864", data: "2025-08-10", hora: "14:00:00", qtd: 30000.00, area_solicitante: "7698259832" },
            { id_canal: "7698495865", data: "2025-08-10", hora: "16:00:00", qtd: 15000.00, area_solicitante: "7698259832" },

            // 2025-12-24 - Área "Marca" (ID: 9518538810)
            { id_canal: "7698495865", data: "2025-12-24", hora: "10:00:00", qtd: 5000.00, area_solicitante: "9518538810" },
            { id_canal: "7698495864", data: "2025-12-24", hora: "14:00:00", qtd: 10000.00, area_solicitante: "9518538810" },
            { id_canal: "7698495865", data: "2025-12-24", hora: "15:00:00", qtd: 7500.00, area_solicitante: "9518538810" },
            { id_canal: "7698495864", data: "2025-12-24", hora: "16:00:00", qtd: 15000.00, area_solicitante: "9518538810" },
            { id_canal: "7698495864", data: "2025-12-24", hora: "18:00:00", qtd: 20000.00, area_solicitante: "9518538810" },

            // 2025-12-25 - Área "Cards" (ID: 7698259651)
            { id_canal: "7698495864", data: "2025-12-25", hora: "09:00:00", qtd: 8000.00, area_solicitante: "7698259651" },
            { id_canal: "7698495865", data: "2025-12-25", hora: "11:00:00", qtd: 6000.00, area_solicitante: "7698259651" },
            { id_canal: "7698495864", data: "2025-12-25", hora: "14:00:00", qtd: 12000.00, area_solicitante: "7698259651" },
            { id_canal: "7698495865", data: "2025-12-25", hora: "17:00:00", qtd: 8500.00, area_solicitante: "7698259651" }
        ];

        for (const scheduleData of schedulesData) {
            const schedule = scheduleRepository.create(scheduleData);
            await scheduleRepository.save(schedule);
        }
    }
}
