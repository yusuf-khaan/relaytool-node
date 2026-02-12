import { QueryResult } from "pg";

export default abstract class AbstractPostgresClient {
  constructor() {
    if (new.target === AbstractPostgresClient) {
      throw new Error("Cannot instantiate AbstractPostgresClient directly");
    }
  }
  public abstract executeQuery(request: any): Promise<QueryResult>;
  public abstract insertRow(request: any): Promise<QueryResult>;
  public abstract selectRows(request: any): Promise<QueryResult>;
}
