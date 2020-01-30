import "./server";
import "./service/socket";
import fs from "fs";

fs.writeFileSync("./storage-access.json", process.env.STORAGE_JSON);
