const { DataSource } = require("typeorm");
require("dotenv").config();

module.exports = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST_SQL || "localhost",
  port: parseInt(process.env.DB_PORT_SQL || "3306"),
  username: process.env.DB_USERNAME || "picpay_db",
  password: process.env.DB_PASSWORD || "MN,Bkx39^!1N>7ok5.Y",
  database: process.env.DB_DATABASE || "picpay_db",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [
    process.env.NODE_ENV === "production" 
      ? "dist/entities/**/*.js" 
      : "src/entities/**/*.ts"
  ],
  migrations: [
    process.env.NODE_ENV === "production" 
      ? "dist/migrations/**/*.js" 
      : "src/migrations/**/*.ts"
  ],
  subscribers: [
    process.env.NODE_ENV === "production" 
      ? "dist/subscribers/**/*.js" 
      : "src/subscribers/**/*.ts"
  ],
});
