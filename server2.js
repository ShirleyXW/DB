const mysql = require("mysql2");
const http = require("http");
const url = require("url");


class DBManager {
  constructor() {
    this.connection = null;
  }
  connectDatabase() {
    this.connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "Lili1996",
      database: "lab5",
    });
    this.connection.connect((err) => {
      if (err) {
        console.error("connect failure: " + err.stack);
        return;
      }
      console.log("connected to MySQL, connection ID: " + this.connection.threadId);
    });
  }
  disconnectDatabase() {
    if(this.connection){
      this.connection.end();
    }
  }
  createPatientTable() {

    if (!this.connection) {
      console.error("Database not connected!");
      return;
    }
    const createPatientTable = 
    `CREATE TABLE IF NOT EXISTS patient (
      patient_id INT(11) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      dateOfBirth DATE NOT NULL
    )ENGINE=InnoDB;`;

    this.connection.query(createPatientTable, (err, result) => {
      if (err) {
        console.error("create patient table failure: " + err.stack);
        return;
      }
      console.log("create patient table success");
    });
  }
}

// Test the DBManager class
const dbManager = new DBManager();

class Server {
  constructor(dbManager, requestHandler) {
    this.dbManager = dbManager;
    this.requestHandler = requestHandler;
  }
  run(){
    const Server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathName = parsedUrl.pathname;
      const query = parsedUrl.query;
    })
  }
}
