import { DataSource } from "typeorm";
import dotenv from "dotenv";
import "reflect-metadata";

dotenv.config();

export default new DataSource({
  type: "mysql",
  host: process.env.DB_HOST_SQL || "localhost",
  port: parseInt(process.env.DB_PORT_SQL || "3306"),
  username: process.env.DB_USERNAME || "picpay_db",
  password: process.env.DB_PASSWORD || "MN,Bkx39^!1N>7ok5.Y",
  database: process.env.DB_DATABASE || "picpay_db",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: ["src/entities/**/*.ts"],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: ["src/subscribers/**/*.ts"],
});
