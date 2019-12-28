require("dotenv").config();
import app from "./api";
import { Server } from "http";

const server = new Server(app);

server.listen(process.env.SERVER_PORT);

export default server;

