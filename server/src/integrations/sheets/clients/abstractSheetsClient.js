class AbstractSheetsClient {
    async createSheet(title) {
        throw new Error("Method 'createSheet(title)' must be implemented.");
    }

    async writeData(spreadsheetId, range, values) {
        throw new Error("Method 'writeData(spreadsheetId, range, values)' must be implemented.");
    }

    async readData(spreadsheetId, range) {
        throw new Error("Method 'readData(spreadsheetId, range)' must be implemented.");
    }

    async appendData(spreadsheetId, range, values) {
        throw new Error("Method 'appendData(spreadsheetId, range, values)' must be implemented.");
    }
}

export default AbstractSheetsClient;
