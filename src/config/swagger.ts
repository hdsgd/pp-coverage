import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';

const isCompiled = __dirname.includes('dist');

const apisGlobs = isCompiled
  ? [
      path.join(__dirname, '..', 'routes', '*.js'),
      path.join(__dirname, '..', 'controllers', '*.js'),
    ]
  : [
      path.join(__dirname, '..', 'routes', '*.ts'),
      path.join(__dirname, '..', 'controllers', '*.ts'),
    ];

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PicPay Integration API',
      version: '1.0.0',
      description: `
        API para integração com Monday.com e gerenciamento de agendamentos de canais.
        
        ## Funcionalidades:
        
        ### Monday.com Integration
        - Sincronização de boards e itens do Monday.com
        - Configuração de campos de consulta personalizados
        - Extração automática de valores dos column_values
        
        ### Channel Schedules
        - Criação e gerenciamento de agendamentos de canais
        - Validação de formatos de data (DD/MM/YYYY) e hora (HH:MM)
        - Busca por canal, data ou ID
        - Suporte a quantidades decimais de alta precisão
        
        ## Formatos de Data e Hora:
        - **Data**: DD/MM/YYYY (ex: 25/12/2025)
        - **Hora**: HH:MM formato 24h (ex: 14:30)
      `,
      contact: {
        name: 'PicPay Team',
        email: 'dev@picpay.com',
      },
    },
    servers: [
      {
        url: process.env.SWAGGER_HOST || `http://localhost:${process.env.PORT || 3000}`,
        description: 'Servidor da aplicação',
      },
    ],
    components: {
      schemas: {
        MondayBoard: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do board no sistema',
            },
            name: {
              type: 'string',
              description: 'Nome do board',
              example: 'Área Solicitante',
            },
            board_id: {
              type: 'string',
              description: 'ID do board no Monday.com',
              example: '7400348232',
            },
            description: {
              type: 'string',
              description: 'Descrição do board',
              example: 'Board para área solicitante',
            },
            query_fields: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Campos a serem consultados na API do Monday.com',
              example: ['id', 'name', 'status', 'created_at'],
            },
            is_active: {
              type: 'boolean',
              description: 'Status de ativação do board',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de atualização',
            },
          },
        },
        MondayItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do item no sistema',
            },
            item_id: {
              type: 'string',
              description: 'ID do item no Monday.com',
              example: '12345678',
            },
            name: {
              type: 'string',
              description: 'Nome do item',
              example: 'Marketing',
            },
            board_id: {
              type: 'string',
              description: 'ID do board associado',
            },
            raw_data: {
              type: 'object',
              description: 'Dados brutos do Monday.com',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de atualização',
            },
          },
        },
        CreateMondayBoardDto: {
          type: 'object',
          required: ['name', 'board_id'],
          properties: {
            name: {
              type: 'string',
              description: 'Nome do board',
              example: 'Novo Board',
            },
            board_id: {
              type: 'string',
              description: 'ID do board no Monday.com',
              example: '7400348232',
            },
            description: {
              type: 'string',
              description: 'Descrição do board',
              example: 'Descrição do board',
            },
            query_fields: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Campos a serem consultados',
              example: ['id', 'name', 'status'],
            },
          },
        },
        ChannelSchedule: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do agendamento no sistema',
            },
            id_canal: {
              type: 'string',
              description: 'Identificador do canal',
              example: 'email',
            },
            data: {
              type: 'string',
              pattern: '^[0-9]{2}/[0-9]{2}/[0-9]{4}$',
              description: 'Data do agendamento no formato DD/MM/YYYY',
              example: '25/12/2025',
            },
            hora: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Hora do agendamento no formato HH:MM',
              example: '14:30',
            },
            qtd: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              description: 'Quantidade agendada',
              example: 1000.50,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de atualização',
            },
          },
        },
        CreateChannelScheduleDto: {
          type: 'object',
          required: ['id_canal', 'data', 'hora', 'qtd'],
          properties: {
            id_canal: {
              type: 'string',
              description: 'Identificador do canal',
              example: 'email',
            },
            data: {
              type: 'string',
              pattern: '^[0-9]{2}/[0-9]{2}/[0-9]{4}$',
              description: 'Data do agendamento no formato DD/MM/YYYY',
              example: '25/12/2025',
            },
            hora: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Hora do agendamento no formato HH:MM',
              example: '14:30',
            },
            qtd: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              description: 'Quantidade agendada',
              example: 1000.50,
            },
          },
        },
        UpdateChannelScheduleDto: {
          type: 'object',
          properties: {
            id_canal: {
              type: 'string',
              description: 'Identificador do canal',
              example: 'sms',
            },
            data: {
              type: 'string',
              pattern: '^[0-9]{2}/[0-9]{2}/[0-9]{4}$',
              description: 'Data do agendamento no formato DD/MM/YYYY',
              example: '26/12/2025',
            },
            hora: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Hora do agendamento no formato HH:MM',
              example: '15:00',
            },
            qtd: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              description: 'Quantidade agendada',
              example: 1500.75,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensagem de erro',
            },
            error: {
              type: 'string',
              description: 'Detalhes do erro',
            },
          },
        },
      },
    },
  },
  apis: apisGlobs, // Ajuste dinâmico para encontrar as anotações em dev (src) e prod (dist)
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Monday.com Integration API',
  }));
};

export default specs;
