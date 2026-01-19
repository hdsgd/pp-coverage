# Monday.com Integration API

API REST em TypeScript para integração com Monday.com, com MySQL e build em Docker otimizado. Inclui sincronização de boards, filtros dinâmicos e cálculo de disponibilidade por canal/horário.

## ⚡ Guia rápido

1) Copie `.env.example` para `.env` (dev local) e ajuste as variáveis.
2) Opcional Docker: crie/ajuste `.env.docker` para container (usa MySQL interno do docker-compose).
3) Dev: `npm install`; `npm run setup:dev`; `npm run dev`.
4) Prod (sem Docker): `npm run build`; `npm start`.
5) Com Docker: `docker compose build`; `docker compose up -d`.

## 🚀 Funcionalidades

- **Integração Monday.com**: Conexão via GraphQL API
- **Sincronização de Dados**: Boards configurados com campos dinâmicos
- **Cálculo de Disponibilidade**: Sistema avançado de disponibilidade por canal e horário
- **Filtragem Inteligente**: Itens por status "Ativo"
- **Banco MySQL**: Armazenamento local otimizado
- **API RESTful**: Interface completa para consulta dos dados
- **Documentação Swagger**: Interface interativa para testes

## 📋 Pré-requisitos

- **Node.js** v18 ou superior
- **MySQL** v8.0 ou superior
- **npm** ou **yarn**
- **Windows** (ambiente testado)
- **Docker Desktop** (opcional, para rodar em container)

## ⚙️ Configuração do Ambiente

### 1. Clonar o Repositório
```bash
git clone <repository-url>
cd picpay-api
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Banco de Dados MySQL

No Windows com MySQL 8.0:

```sql
-- Conectar ao MySQL como administrador
  mysql -u root -p

-- Criar banco de dados
CREATE DATABASE picpay_db;

-- Criar usuário (opcional)
CREATE USER picpay_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE picpay_db TO picpay_user;

CREATE USER 'picpay_user'@'localhost' IDENTIFIED BY '#Alvorada13';
GRANT ALL PRIVILEGES ON picpay_db.* TO 'picpay_user'@'localhost';
FLUSH PRIVILEGES;

```

### 4. Configurar Variáveis de Ambiente

- Ambiente local (dev/produção sem Docker): use `.env`.
- Ambiente em container: use `.env.docker` (carregado pelo `docker-compose.yml`).

Copie o arquivo `.env.example` para `.env` e configure:

```env
NODE_ENV=development
PORT=3000

# Banco de Dados MySQL
DB_HOST_SQL=localhost
DB_PORT_SQL=3306
DB_USERNAME=picpay_db
DB_PASSWORD=MN,Bkx39^!1N>7ok5.Y
DB_DATABASE=picpay_db

# API Configuration
API_PREFIX=/api/v1

# Monday.com API
MONDAY_API_TOKEN=your_monday_token_here
```

Para Docker (Windows), preferira `.env.docker` com:

```env
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# Banco de Dados externo ao container
DB_HOST=host.docker.internal  # Postgres rodando no host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=picpay_db

# Monday.com
MONDAY_API_TOKEN=your_monday_token_here
```

Importante: não commite tokens/segredos. Use `.env`/`.env.docker` apenas localmente.

### 5. Executar Migrations e Seeds

```bash
# Executar migrations
npm run migration:run

# Executar seeds (dados de exemplo)
npm run seed:run

# Ou executar ambos de uma vez
npm run setup:dev
```

### 6. Iniciar a Aplicação

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🐳 Executar com Docker (Postgres externo)

O projeto já inclui `Dockerfile` multi-stage e `docker-compose.yml` para subir apenas a API (o Postgres é externo ao container).

1) Ajuste `.env.docker` (especialmente `DB_HOST`). No Windows, use `host.docker.internal` para acessar o Postgres do host.

2) Build da imagem:

```powershell
docker compose build
```

3) Subir a API em background:

```powershell
docker compose up -d
```

4) Logs e status:

```powershell
docker compose logs -f picpay-api
docker compose ps
```

5) Derrubar os containers:

```powershell
docker compose down
```

Notas:
- A porta exposta é `3000` (ou `${PORT}` no `.env.docker`).
- Garanta que o Postgres esteja acessível a partir da rede do Docker.
- Em Linux, `host.docker.internal` pode não existir; use o IP do host.

Usar imagem publicada no Docker Hub com docker-compose:

1) Edite `docker-compose.yml` e troque para usar apenas a imagem publicada (remova o bloco `build:`):

```yaml
services:
  picpay-api:
    image: seuusuario/picpay-api:latest
    container_name: picpay-api
    env_file:
      - .env
      - .env.docker
    ports:
      - "3000:3000"
    restart: unless-stopped
```

2) Suba normalmente:

```powershell
docker compose up -d
```

### Executar com Dockerfile (sem docker-compose)

1) Build da imagem na raiz do projeto:

```powershell
docker build -t picpay-api:latest .
```

2) Rodar o container usando o `.env.docker`:

```powershell
docker run -d --name picpay-api `
  --env-file .env.docker `
  -p 3000:3000 `
  picpay-api:latest
```

3) Ver logs e status:

```powershell
docker logs -f picpay-api
docker ps
```

4) Parar e remover o container:

```powershell
docker stop picpay-api
docker rm picpay-api
```

Comandos úteis (direto com Docker):

```powershell
docker images                 # Lista imagens
docker rmi picpay-api:latest  # Remove a imagem
docker exec -it picpay-api sh # Shell dentro do container

### Publicar a imagem no Docker Hub

1) Faça login no Docker Hub:

```powershell
docker login
```

2) Defina seu usuário e versão (substitua "seuusuario" e a versão desejada):

```powershell
$User="seuusuario"; $Image="picpay-api"; $Version="1.0.0"
```

3) Gere as tags e faça o push:

```powershell
# Build com label de versão opcional
docker build --build-arg VERSION=$Version -t $User/$Image:$Version -t $User/$Image:latest .

# Enviar para o Docker Hub
docker push $User/$Image:$Version
docker push $User/$Image:latest
```

4) Executar a partir do Docker Hub (exemplo):

```powershell
docker run -d --name picpay-api `
  --env-file .env.docker `
  -p 3000:3000 `
  seuusuario/picpay-api:latest
```
```

## 🗃️ Estrutura do Banco de Dados

### Tabelas Principais

#### monday_boards
- id: uuid (PK)
- name: varchar(100) unique — nome do board
- board_id: bigint — id no Monday.com
- description: varchar(500) null
- is_active: boolean default true
- query_fields: text[] default ['id','name','status']
- created_at: timestamp (gerado)
- updated_at: timestamp (gerado)

Índices recomendados: name (unique implícito)

#### monday_items
- id: uuid (PK)
- item_id: bigint — id do item no Monday.com
- name: varchar(255)
- status: varchar(50)
- max_value: decimal(15,2) null
- code: varchar(100) null — código auxiliar
- team: text[] null — times associados
- board_id: uuid (FK -> monday_boards.id)
- created_at: timestamp (gerado)
- updated_at: timestamp (gerado)

Índices recomendados: (board_id), (status), compostos conforme necessidade de consulta

#### channel_schedules
- id: uuid (PK)
- id_canal: varchar(255) — identificador do canal/item
- data: date
- hora: time
- qtd: decimal(15,2)
- created_at: timestamp (gerado)
- updated_at: timestamp (gerado)

Índices recomendados: (id_canal), (data), (hora), composto (id_canal, data)

#### subscribers
- id: varchar(50) (PK)
- name: varchar(255)
- email: varchar(255)
- board_id: varchar(50) — origem/board de referência
- created_at: timestamp (gerado)
- updated_at: timestamp (gerado)

Observações:
- As migrations em `src/migrations` criam as tabelas e alterações (ex.: adicionar code/team em monday_items).
- O DataSource (`src/config/database.ts`) carrega entidades em runtime e alterna caminhos de migrations para `dist` em produção.

## 📊 Boards Configurados

| Board | ID | Descrição | Campos Padrão |
|-------|----|-----------|-----------------| 
| **Área Solicitante** | 7400348232 | Áreas solicitantes de campanhas | `id`, `name`, `status__1`, `created_at__1` |
| **Tipo de Campanha** | 7400351371 | Tipos de campanhas disponíveis | `id`, `name`, `status__1`, `group__1` |
| **Tipo de Cliente** | 7400357748 | Classificação de tipos de clientes | `id`, `name`, `status__1`, `subscribers__1` |
| **Canal** | 7400353565 | Canais de comunicação | `id`, `name`, `status__1`, `updated_at__1` |
| **Mecânica** | 7400361115 | Mecânicas de campanhas | `id`, `name`, `status__1`, `creator_id__1` |
| **Produto** | 7400364599 | Produtos disponíveis | `id`, `name`, `status__1`, `email__1` |
| **Hora** | 7400365000 | Horários disponíveis | `id`, `name`, `status` |

## 🔌 Endpoints da API

### Documentação Interativa
**Swagger UI**: `http://localhost:3000/api-docs`

### Principais Endpoints

#### Boards
```http
GET /api/v1/monday/boards
GET /api/v1/monday/boards/:id
POST /api/v1/monday/sync
```

#### Items
```http
GET /api/v1/monday/items
GET /api/v1/monday/items/board/:boardId
```

#### Disponibilidade de Canais ⭐
```http
GET /api/v1/monday/channel-schedules/:channelName/:date
```

**Exemplo**:
```http
GET /api/v1/monday/channel-schedules/Email/25%2F12%2F2025
```

**Resposta**:
```json
{
  "success": true,
  "data": [
    {
      "hora": "14:00",
      "available": "990000.00",
      "totalUsado": "10000.00", 
      "maxValue": "1000000.00"
    }
  ],
  "message": "Disponibilidade calculada para o canal 'Email' na data 25/12/2025"
}
```

### Health Check
```http
GET /health
```

## 🛠️ Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Iniciar em modo desenvolvimento
npm run build        # Compilar TypeScript
npm start           # Iniciar em produção
```

### Banco de Dados
```bash
npm run migration:run      # Executar migrations
npm run migration:revert   # Reverter última migration
npm run migration:create   # Criar nova migration
npm run schema:sync       # Sincronizar schema (dev only)
npm run schema:drop       # Deletar schema
```

### Seeds
```bash
npm run seed:run          # Executar seeds
npm run setup:dev         # Migration + Seeds
```

### Docker
```bash
docker compose build           # Build da imagem da API
docker compose up -d           # Sobe a API em background
docker compose logs -f         # Acompanha logs
docker compose exec picpay-api sh -c "node -v && npm -v"  # Comandos dentro do container
docker compose down            # Derruba os containers
```

## 📈 Funcionalidade de Disponibilidade

### Como Funciona

1. **Busca Board "Hora"**: Localiza todas as horas ativas
2. **Identifica Canal**: Obtém configurações do canal específico
3. **Consulta Agendamentos**: Busca schedules para a data
4. **Calcula Disponibilidade**: 
   ```
   Disponível = Max Value - Σ(Quantidades Usadas)
   ```

### Exemplo de Uso

Para verificar disponibilidade do canal "Email" em 25/12/2025:

```bash
curl -X GET "http://localhost:3000/api/v1/monday/channel-schedules/Email/25%2F12%2F2025"
```

### Dados de Exemplo Incluídos

As seeds criam automaticamente:
- **5 Canais**: Email, SMS, WhatsApp, Push Notification, Facebook Ads
- **21 Horários**: 03:00 até 23:00 (horários comerciais + madrugada)
- **Agendamentos**: Dados exemplo para testes
- **Tipos de Cliente**: Premium, Standard, Basic
- **Áreas**: Marketing, Vendas, CRM

## 🔧 Solução de Problemas

### Erro de Conexão MySQL
```bash
# Verificar se MySQL está rodando
# Windows: Services -> MySQL80
# Ou via PowerShell:
Get-Service -Name mysql*
```

### Erro de Permissions
```sql
-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON DATABASE picpay_db TO your_user;
GRANT ALL ON SCHEMA public TO your_user;
```

### Recriar Banco Completo
```bash
npm run schema:drop     # Deletar schema
npm run setup:dev       # Recriar tudo
```

## 📝 Logs e Debugging

Em modo desenvolvimento, a aplicação exibe:
- ✅ Status de conexão com BD
- 📊 Queries SQL executadas  
- 🔍 Logs detalhados de busca
- ⏰ Cálculos de disponibilidade

## 🚀 Deploy

### Build para Produção
```bash
npm run build
```

### Variáveis de Produção
```env
NODE_ENV=production
DB_HOST=your_prod_host
DB_USERNAME=your_prod_user
DB_PASSWORD=your_prod_password
```

### Produção com Docker

1) Configure `.env.docker` com credenciais de produção (Postgres gerenciado/externo).

2) Construa e suba a API:

```powershell
docker compose build
docker compose up -d
```

3) Verifique health e Swagger:

```
GET http://<host>:3000/health
GET http://<host>:3000/api-docs
```

## 📚 Tecnologias Utilizadas

- **Backend**: Node.js, TypeScript, Express.js
- **ORM**: TypeORM
- **Banco**: MySQL 8.0
- **Documentação**: Swagger/OpenAPI
- **Validação**: class-validator, class-transformer
- **Integração**: Monday.com GraphQL API

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido por**: Ilegra  
**Versão**: 1.0.0  
**Ambiente**: Windows + MySQL 8.0
