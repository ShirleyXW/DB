const mysql = require("mysql2/promise");
const http = require("http");
const url = require("url");

class DBManager {
  constructor() {
    this.connection = null;
  }
  async connectDatabase() {
    try {
      this.connection = await mysql.createConnection({
        host: "localhost",
        user: "lab5_user",
        password: "comp4537",
        database: "lab5",
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
      console.log("create patient table success");
    } catch (err) {
      console.error("create patient table failure: " + err.stack);
    }
  }

  async insertMultiple(records) {
    if (!this.connection) {
      throw new Error("Database not connected!");
    }
    const recordsValues = records.map((record) => [
      record.name,
      record.dateOfBirth,
    ]);
    const insertMultipleRecords = `INSERT INTO patient (name, dateOfBirth) VALUES ?`;
    try {
      await this.connection.query(insertMultipleRecords, [recordsValues]);
    } catch (err) {
      console.error("insert multiple records failure: " + err.stack);
      throw err;
    }
  }
}

class RequestHandler {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  sendResponse(res, statusCode, isSuccess, message) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ isSuccess, message }));
  }

  async insertBulkRecords(req, res) {
    if (!this.dbManager.connection) {
      console.error("Database not connected!");
      this.sendResponse(res, 500, false, "Database not connected!");
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    console.log(`Received body: ${body}`);
    req.on("end", async () => {
      try {
        if (!body) {
          this.sendResponse(res, 400, false, "Cannot insert empty records");
          return;
        }

        let records;
        try {
          records = JSON.parse(body);
        } catch (err) {
          this.sendResponse(res, 400, false, "Invalid JSON format");
          return;
        }

        try {
          await this.dbManager.insertMultiple(records);
          this.sendResponse(res, 200, true, "Insert records success");
        } catch (err) {
          this.sendResponse(
            res,
            500,
            false,
            `Failed to insert records: ${err.message}`
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
      if (pathName === "/insert-bulk-records" && req.method === "POST") {
        // Insert a bulk of patient records
        this.requestHandler.insertBulkRecords(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      }
    });
    server.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  }
}

(async () => {
  const dbManager = new DBManager();
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
