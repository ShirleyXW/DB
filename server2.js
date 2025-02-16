const mysql = require("mysql2/promise");
const http = require("http");
const url = require("url");
require("dotenv").config();

class DBManager {
  constructor() {
    this.connection = null;
  }
  async connectDatabase() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
      console.log(
        "connected to MySQL, connection ID: " + this.connection.threadId
      );
      return true;
    } catch (err) {
      console.error("connect failure: " + err.stack);
      return false;
    }
  }
  async disconnectDatabase() {
    if (this.connection) {
      await this.connection.end();
    }
  }
  async createPatientTable() {
    if (!this.connection) {
      console.error("Database not connected!");
      return;
    }
    const createPatientTable = `CREATE TABLE IF NOT EXISTS patient (
      patient_id INT(11) AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      dateOfBirth DATE NOT NULL
    )ENGINE=InnoDB;`;

    try {
      await this.connection.query(createPatientTable);
    } catch (err) {
      console.error("create patient table failure: " + err.stack);
    }
  }

  async execute(statement) {
    if (!this.connection) {
      throw new Error("Database not connected!");
    }
    try {
      const [result] = await this.connection.query(statement);
      return result;
    } catch (err) {
      console.error("execute statement failure: " + err.stack);
      throw err;
    }
  }
  async insert(records) {
    if (!this.connection) {
      throw new Error("Database not connected!");
    }
    const insertRecord = `INSERT INTO patient (name, dateOfBirth) VALUES ?`;
    const recordValues = records.map((record) => [
      record.name,
      record.dateOfBirth,
    ]);
    try {
      await this.connection.query(insertRecord, [recordValues]);
    } catch (err) {
      console.error("insert record failure: " + err.stack);
      throw err;
    }
  }
}

class RequestHandler {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  sendResponse(res, statusCode, isSuccess, message) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ isSuccess, message }));
  }

  async selectPatient(req, res, query) {
    if (!this.dbManager.connection) {
      this.sendResponse(res, 500, false, "Database not connected!");
      return;
    }
    const statement = query.sql;
    if (!statement) {
      this.sendResponse(res, 400, false, "Missing SQL query parameter");
      return;
    }
    if (!statement.trim().toLowerCase().startsWith("select")) {
      this.sendResponse(res, 400, false, "Only SELECT queries are allowed");
      return;
    }
    try {
      const rows = await this.dbManager.execute(statement);
      res.writeHead(200, { 
        "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
       });
      res.end(JSON.stringify({ isSuccess: true, data: rows }));
    } catch (err) {
      this.sendResponse(
        res,
        500,
        false,
        `Failed to execute query: ${err.message}`
      );
    }
  }
  async insertBulkRecords(req, res) {
    this.insertPatient(req, res);
  }

  async insertPatient(req, res) {
    if (!this.dbManager.connection) {
      this.sendResponse(res, 500, false, "Database not connected!");
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        if (!body) {
          this.sendResponse(res, 400, false, "Cannot insert empty records");
          return;
        }
        let record;
        console.log("received body: " + body);
        try {
          record = JSON.parse(body);
        } catch (err) {
          this.sendResponse(res, 400, false, "Invalid JSON format");
          return;
        }

        try {
          await this.dbManager.insert(record);
          this.sendResponse(res, 200, true, "Insert records success");
        } catch (err) {
          this.sendResponse(
            res,
            500,
            false,
            `Failed to insert record: ${err.message}`
          );
        }
      } catch {
        this.sendResponse(res, 500, false, "Internal server error");
      }
    });
  }
}

class Server {
  constructor(dbManager, requestHandler) {
    this.dbManager = dbManager;
    this.requestHandler = requestHandler;
  }
  run() {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathName = parsedUrl.pathname;
      const query = parsedUrl.query;
      if (pathName === "/api/v1/sql/insert" && req.method === "POST") {
        this.requestHandler.insertPatient(req, res);
      } else if (pathName === "/api/v1/sql/select" && req.method === "GET") {
        this.requestHandler.selectPatient(req, res, query);
      } else if (
        pathName === "/api/v1/sql/insert-bulk-records" &&
        req.method === "POST"
      ) {
        this.requestHandler.insertBulkRecords(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      }
    });
    server.listen(3020, () => {
      console.log("Server is running on http://localhost:3020");
    });
  }
}

const dbManager = new DBManager();
(async () => {
  const requestHandler = new RequestHandler(dbManager);
  const server = new Server(dbManager, requestHandler);
  try {
    await dbManager.connectDatabase();
    // await dbManager.createPatientTable();
    if (!dbManager.connection) {
      return;
    }
    server.run();
  } catch (err) {
    console.error("connect database failure: " + err.stack);
  }
})();

// Code sourced from: ChatGPT, OpenAI
// For gracefully closing the database connection and handling SIGINT signal
process.on("SIGINT", async () => {
  console.log("Closing database connection...");
  await dbManager.disconnectDatabase();
  process.exit(0);
});
