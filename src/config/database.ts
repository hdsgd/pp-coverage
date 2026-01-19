import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { MondayBoard } from "../entities/MondayBoard";
import { MondayItem } from "../entities/MondayItem";
import { ChannelSchedule } from "../entities/ChannelSchedule";
import { Subscriber } from "../entities/Subscriber";
import { User } from "../entities/User";

dotenv.config();

// Detect if running compiled code (dist) to correctly resolve migrations/subscribers
const isCompiled = __dirname.includes("dist");
const isProdLike = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "build";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST_SQL || "localhost",
  port: parseInt(process.env.DB_PORT_SQL || "3306"),
  username: process.env.DB_USERNAME || "picpay_db",
  password: process.env.DB_PASSWORD || "MN,Bkx39^!1N>7ok5.Y",
  database: process.env.DB_DATABASE || "picpay_db",
  synchronize: process.env.NODE_ENV === "development",
  entities: [MondayBoard, MondayItem, ChannelSchedule, Subscriber, User],
  migrations: [
  isCompiled || isProdLike ? "dist/migrations/**/*.js" : "src/migrations/**/*.ts"
  ],
  subscribers: [
  isCompiled || isProdLike ? "dist/subscribers/**/*.js" : "src/subscribers/**/*.ts"
  ],
});
