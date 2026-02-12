import { google } from 'googleapis';
import AbstractSheetsClient from './abstractSheetsClient.js';

class SheetClient extends AbstractSheetsClient {
  constructor(authOrSheets) {
    super();
    // authOrSheets can be an OAuth2 client, a JWT client, or an already
    // built sheets object (service-account path).
    this.sheets = authOrSheets.spreadsheets
      ? authOrSheets                       // already built
      : google.sheets({ version: 'v4', auth: authOrSheets });
  }

  async createSheet(title) {
    const { data } = await this.sheets.spreadsheets.create({
      resource: { properties: { title } },
      fields: 'spreadsheetId'
    });
    return data.spreadsheetId;
  }

  async readData(spreadsheetId, range = 'Sheet1!A1:Z1000') {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId, range
    });
    return data.values || [];
  }

  async appendData(spreadsheetId, range, values) {
    const { data } = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values }
    });
    return data;
  }

  async writeData(spreadsheetId, range, values) {
    const { data } = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values }
    });
    return data;
  }
}

export default SheetClient;