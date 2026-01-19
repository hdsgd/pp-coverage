import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { SeedMondayBoards } from "./SeedMondayBoards";
import { SeedMondayItemsReal } from "./SeedMondayItems_Real";
import { SeedChannelSchedules } from "./SeedChannelSchedules";
import { SeedUsers } from "./SeedUsers";

async function runSeeds() {
    try {
        console.log("🌱 Iniciando processo de seed...");
        
        // Initialize database connection
        await AppDataSource.initialize();
        console.log("✅ Conexão com banco de dados estabelecida");

        // Run migrations first
        await AppDataSource.runMigrations();
        console.log("✅ Migrations executadas");

        // Run seeds in order
        console.log("\n👤 Criando usuários...");
        await SeedUsers.run(AppDataSource);

        console.log("\n📋 Criando boards...");
        await SeedMondayBoards.run(AppDataSource);

        console.log("\n📊 Criando items com dados reais do banco...");
        await SeedMondayItemsReal.run(AppDataSource);

        console.log("\n📅 Criando agendamentos...");
        await SeedChannelSchedules.run(AppDataSource);

        console.log("\n🎉 Processo de seed concluído com sucesso!");
        
    } catch (error) {
        console.error("❌ Erro durante execução das seeds:", error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("🔌 Conexão com banco de dados finalizada");
        }
    }
}

// Execute if called directly
if (require.main === module) {
    runSeeds();
}

export { runSeeds };
