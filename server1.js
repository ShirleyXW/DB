import { htmlText, defaultUser } from "./lang/en/users.js";

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
        this.header = document.querySelector("header");
        this.footer = document.querySelector("footer");
    }
    setHeaderAndFooter() {
        console.log(this.header);
        this.header.textContent = htmlText.header;
        this.footer.textContent = htmlText.footer;
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
        this.setHeaderAndFooter();
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
            const result = await response.json();
            return result;
        } catch (err) {
            console.error(err);
            return { isSuccess: false, message: `INSERT ERROR: ${err.message}` };
        }
    }
}

class EventHandler {
    constructor() {
        this.defaultUsers = [
            { name: "Sara Brown", dateOfBirth: "1901-01-01" },
            { name: "John Smith", dateOfBirth: "1931-01-01" },
            { name: "Jack Ma", dateOfBirth: "1961-01-30" },
            { name: "Elon Musk", dateOfBirth: "1999-01-01" },
        ];
        this.dbController = new DBController("https://bcit-anthony-sh-s.com");
        this.addBtn = document.getElementById("default-adding-button");
        this.queryBtn = document.getElementById("execute-btn");
    }
    handleAddBtnEvent() {
        const resultMsgP = document.getElementById("result-msg");
        this.addBtn.addEventListener("click", async () => {
            console.log("Add button clicked");
            try {
                const response = await this.dbController.executeInsertQuery(
                    this.defaultUsers,
                    true
                );
                if (response.isSuccess) {
                    resultMsgP.classList.add("text-blue-700");
                    resultMsgP.textContent = response.message;
                } else {
                    resultMsgP.classList.add("text-red-700");
                    resultMsgP.textContent = response.message;
                }
                console.log(response);
            } catch (err) {
                console.error(err);
            }
        });
    }
    handleExecuteQueryBtnEvent() {
        const resultMsgP = document.getElementById("query-result");
        const queryInput = document.getElementById("sql-query");
        const queryTableContainer = document.getElementById("query-table-container");
        this.queryBtn.addEventListener("click", async () => {
            queryTableContainer.innerHTML = "";
            const inputtedQuery = queryInput.value.trim();
            console.log(inputtedQuery);
            if (!inputtedQuery) {
                resultMsgP.classList.add("text-red-700");
                resultMsgP.textContent = "Please enter SQL query.";
                return;
            }
            const firstWord = inputtedQuery.split(/\s+/)[0].toUpperCase();
            if (firstWord !== "SELECT" && firstWord !== "INSERT") {
                resultMsgP.classList.remove("text-blue-700");
                resultMsgP.classList.add("text-red-700");
                resultMsgP.textContent = "Only SELECT and INSERT queries are supported.";
                return;
            }
            try {
                let response;
                if (firstWord === "SELECT") {
                    response = await this.dbController.executeSelectQuery(inputtedQuery);
                    if (response.isSuccess && response.data.length > 0) {
                        this.displayQueryResults(response.data, queryTableContainer);
                        resultMsgP.classList.remove("text-red-700");
                        resultMsgP.classList.add("text-blue-700");
                        resultMsgP.textContent = "Query executed successfully.";
                    } else {
                        resultMsgP.classList.remove("text-blue-700");
                        resultMsgP.classList.add("text-red-700");
                        resultMsgP.textContent = "No results found.";
                    }
                } else if (firstWord === "INSERT") {
                    try {
                        const userData = this.parseSQLInsert(inputtedQuery);
                        console.log("USERDATA: ", userData);
                        const isBulk = Array.isArray(userData);
                        response = await this.dbController.executeInsertQuery(userData, isBulk);
                        console.log("INSERT Response", response);
                        if (response.isSuccess) {
                            resultMsgP.classList.remove("text-red-700");
                            resultMsgP.classList.add("text-blue-700");
                            resultMsgP.textContent = response.message;
                        } else {
                            resultMsgP.classList.remove("text-blue-700");
                            resultMsgP.classList.add("text-red-700");
                            resultMsgP.textContent = response.message;
                        }
                    } catch (error) {
                        resultMsgP.classList.remove("text-blue-700");
                        resultMsgP.classList.add("text-red-700");
                        resultMsgP.textContent = "Invalid column values format";
                    }

                    // resultMsgP.textContent = response.message;
                }
                console.log(response);
            } catch (err) {
                console.error(err);
            }
        });
    }
    parseSQLInsert(query) {
        const match = query.match(/\bINSERT INTO\s+(\w+)\s*(?:\((.+?)\))?\s*VALUES\s*(.+?);?$/is);
        if (!match) {
            throw new Error("Invalid SQL INSERT statement");
        }

        const tableName = match[1];
        const columns = match[2] ? match[2].split(/\s*,\s*/) : ["name", "dateOfBirth"]; // 명시된 컬럼 또는 기본 컬럼
        let valuesPart = match[3];

        // 줄바꿈과 공백을 정리하여 처리
        valuesPart = valuesPart.replace(/\s*\n\s*/g, " ").trim();

        // 여러 개의 VALUES 그룹을 분리
        const values = valuesPart.split(/\),\s*\(/).map((row) => row.replace(/[()]/g, ""));

        const records = values.map((row) => {
            // 값 추출 (문자열, 숫자, 날짜 포함)
            const rowValues = row.match(
                /"([^"]*)"|'([^']*)'|(\d{4}-\d{2}-\d{2})|(\d+\.\d+)|(\d+)/g
            );
            if (!rowValues || rowValues.length !== columns.length) {
                throw new Error("Invalid column values format");
            }

            const obj = {};
            columns.forEach((col, i) => {
                let value = rowValues[i].replace(/['"]/g, "");
                obj[col] = isNaN(value) || /\D/.test(value) ? value : Number(value);
            });

            return obj;
        });

        return records.length === 1 ? records[0] : records;
    }

    displayQueryResults(data, container) {
        container.innerHTML = "";

        if (data.length === 0) {
            container.innerHTML = "<p class='text-gray-700'>No results found.</p>";
            return;
        }

        const table = document.createElement("table");
        table.classList.add(
            "w-full",
            "border-collapse",
            "border",
            "border-gray-300",
            "shadow-md",
            "rounded-md",
            "bg-white"
        );

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.classList.add("bg-gray-200", "text-left");

        const columns = Object.keys(data[0]);
        columns.forEach((col) => {
            const th = document.createElement("th");
            th.classList.add("border", "px-4", "py-2", "text-gray-700");
            th.textContent = col.replace(/_/g, " ").toUpperCase();
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        data.forEach((row) => {
            const tr = document.createElement("tr");
            tr.classList.add("border-t", "hover:bg-gray-100");

            columns.forEach((col) => {
                const td = document.createElement("td");
                td.classList.add("border", "px-4", "py-2");
                td.textContent = row[col] || "-";
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }
    init() {
        this.handleAddBtnEvent();
        this.handleExecuteQueryBtnEvent();
    }
}

class Server {
    constructor() {
        this.dbController = new DBController("https://bcit-anthony-sh-s.com");
        this.textSetter = new TextSetter();
        this.eventHandler = new EventHandler();
    }

    run() {
        this.textSetter.init();
        this.eventHandler.init();
    }
}

const server = new Server();
server.run();
