import { sheets_v4 } from "googleapis";

export default abstract class AbstractSheetsClient {
  constructor() {
    if (new.target === AbstractSheetsClient) {
      throw new Error("Cannot instantiate AbstractSheetsClient directly");
    }
  }

  public abstract createSheet(
    request: any,
  ): Promise<sheets_v4.Schema$Spreadsheet>;

  public abstract readData(
    request: any,
  ): Promise<sheets_v4.Schema$ValueRange>;

  public abstract appendData(
    request: any,
  ): Promise<sheets_v4.Schema$AppendValuesResponse>;

  public abstract writeData(
    request: any,
  ): Promise<sheets_v4.Schema$UpdateValuesResponse>;
}
