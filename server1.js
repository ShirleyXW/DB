import { htmlText, defaultUser } from "./lang/en/users.js";

const defaultAddingBox = document.getElementById("default-adding-box");

class TextSetter {
    constructor() {
        this.defaultAddingTitle = document.getElementById("default-adding-title");
        this.defaultAddingDescription = document.getElementById("default-adding-description");
        this.defaultUserItems = document
            .getElementById("default-adding-user-box")
            .getElementsByTagName("li");
        this.defaultAddingBtn = document.getElementById("default-adding-button");
        this.defaultAddingResultTitle = document.getElementById("default-adding-result-title");
        this.queryExecutionTitle = document.getElementById("query-title");
        this.queryExecutionDescription = document.getElementById("query-description");
        this.queryExecutionQuery = document.getElementById("sql-query");
        this.queryExecutionBtn = document.getElementById("execute-btn");
        this.queryExecutionResultTitle = document.getElementById("query-result-title");
    }
    setAddingDefaultBoxText() {
        this.defaultAddingTitle.textContent = htmlText.addingDefaultTitle;
        this.defaultAddingDescription.textContent = htmlText.addingDefaultDescription;
        console.log(this.defaultUserItems);
        [...this.defaultUserItems].forEach((li, index) => {
            const pEls = li.getElementsByTagName("p");
            const user = defaultUser[index];
            // Set Name
            pEls[0].textContent = user[0].key;
            const span = document.createElement("span");
            span.classList.add("text-blue-600");
            span.textContent = user[0].value;
            pEls[0].appendChild(span);
            // Set BOD
            pEls[1].textContent = `${user[1].key}${user[1].value}`;
        });
        this.defaultAddingBtn.textContent = htmlText.addingDefaultBtn;
        this.defaultAddingResultTitle.textContent = htmlText.addingDefaultResultTitle;
    }
    setQueryBoxText() {
        this.queryExecutionTitle.textContent = htmlText.queryExecutionTitle;
        this.queryExecutionDescription.textContent = htmlText.queryExecutionDescription;
        this.queryExecutionQuery.setAttribute("placeholder", htmlText.queryExecutionPlaceholder);
        this.queryExecutionBtn.textContent = htmlText.queryExecutionBtn;
        this.queryExecutionResultTitle.textContent = htmlText.queryExecutionResultTitle;
    }
    init() {
        this.setAddingDefaultBoxText();
        this.setQueryBoxText();
    }
}

class DBController {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async executeSelectQuery(sqlQuery) {
        try {
            const encodedQuery = encodeURIComponent(sqlQuery);
            const response = await fetch(`${this.baseURL}/api/v1/sql/select?sql=${encodedQuery}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (err) {
            console.error("Error during fetching data:", err);
        }
    }

    async executeInsertQuery(data, isBulk) {
        try {
            const url = isBulk
                ? `${this.baseURL}/api/v1/sql/insert-bulk-records`
                : `${this.baseURL}/api/v1/sql/insert`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error(err);
            return { isSuccess: false, message: err.message };
        }
    }
}

class Server {
    constructor() {
        this.dbController = new DBController("https://bcit-anthony-sh-s.com");
        this.textSetter = new TextSetter();
    }
    async testSelect() {
        const result = await this.dbController.executeSelectQuery("select * from patient");
        console.log(result);
    }
    async testInsert() {
        const newPatient = { name: "John Doe", dateOfBirth: "1985-08-15" };
        const result = await this.dbController.executeInsertQuery(newPatient);
        console.log(result);
    }
    run() {
        this.textSetter.init();
        // this.testSelect();
        this.testInsert();
    }
}

const server = new Server();
server.run();
