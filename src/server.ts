import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { createChannelScheduleRoutes } from "./routes/channelScheduleRoutes";
import { createAdminScheduleRoutes } from "./routes/adminScheduleRoutes";
import { createAuthRoutes } from "./routes/authRoutes";
import { dropdownRoutes } from "./routes/dropdownRoutes";
import { mondayFormSubmissionRoutes } from "./routes/mondayFormSubmissionRoutes";
import mondayRoutes from "./routes/mondayRoutes";
import subscriberRoutes from "./routes/subscriberRoutes";
import fileUploadRoutes from "./routes/fileUploadRoutes";

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || "/api/v1";

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar Swagger
setupSwagger(app);

// Rotas
app.use(`${API_PREFIX}/monday`, mondayRoutes);
app.use(`${API_PREFIX}/monday`, mondayFormSubmissionRoutes);
app.use(`${API_PREFIX}`, dropdownRoutes);
app.use(`${API_PREFIX}/subscribers`, subscriberRoutes);
app.use(`${API_PREFIX}`, fileUploadRoutes);

// Rota de health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Monday.com Integration API"
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicializar conexão com banco de dados e servidor
const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Conectado ao banco de dados PostgreSQL");
    
    // Registrar rotas após inicialização do banco
    app.use(`${API_PREFIX}/auth`, createAuthRoutes(AppDataSource));
    app.use(`${API_PREFIX}/channel-schedules`, createChannelScheduleRoutes(AppDataSource));
    app.use(`${API_PREFIX}/admin/schedules`, createAdminScheduleRoutes(AppDataSource));

    app.listen(PORT, () => {
      console.log(`🚀 Monday.com API rodando na porta ${PORT}`);
      console.log(`📋 API disponível em http://localhost:${PORT}${API_PREFIX}`);
      console.log(`📚 Documentação Swagger em http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check disponível em http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar o servidor:", error);
    process.exit(1);
  }
};

startServer();
