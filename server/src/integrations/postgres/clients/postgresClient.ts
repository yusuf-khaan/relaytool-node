import Utility from "../../../services/Utility.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";
import knex, { Knex } from "knex";
import { QueryResult } from "pg";
import AbstractPostgresClient from "./abstractPostgresClient.js";

export interface PostgresCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export default class PostgresClient extends AbstractPostgresClient {
  private knex!: Knex;
  private utilityService!: Utility;
  private integrationDetailService = new IntegrationDetailService();

  constructor() {
    super();
  }

  async init(credentials: PostgresCredentials): Promise<void> {
    if (!this.utilityService) {
      this.utilityService = new Utility();
    }

    if (!this.knex) {
      this.knex = knex({
        client: "pg",
        connection: {
          host: credentials.host,
          port: credentials.port,
          database: credentials.database,
          user: credentials.user,
          password: credentials.password,
          ssl: credentials.ssl ? { rejectUnauthorized: false } : false,
        },
        pool: {
          min: 0,
          max: 10,
          idleTimeoutMillis: 30_000,
        },
      });
    }
  }

  private async ensureInitWithDefaults(request: any) {
    console.log(request);
    const userId = request?.data?.userId || request?.userId;
    console.log(userId);
    if (!userId) throw new Error("userId missing");

    const auth = await this.getIntegrationDetails(userId);
    const key = this.getCredentialKey(auth);

    if (PostgresClient.connectionMap.has(key)) {
      this.knex = PostgresClient.connectionMap.get(key)!;
      return;
    }
    console.log(auth);
    await this.init(auth);
    PostgresClient.connectionMap.set(key, this.knex);
  }
  private getCredentialKey(auth: PostgresCredentials) {
    return `${auth.host}:${auth.port}:${auth.database}:${auth.user}`;
  }
  private static connectionMap = new Map<string, Knex>();

  // execute raw query
  async executeQuery(request: any): Promise<QueryResult> {
    await this.ensureInitWithDefaults(request);
    this.ensureInitialized();

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildExecuteQueryPayload()
    );

    if (!payload.query) {
      throw new Error("Query is required");
    }

    payload.query = this.normalizeQuery(payload.query);
    payload.query = this.enforceLimit(payload.query);
    this.validateBindings(payload.query, payload.params || []);
    return await this.knex.raw(payload.query, payload.params || []);
  }

  // insert into table
  async insertRow(request: any): Promise<QueryResult> {
    await this.ensureInitWithDefaults(request);
    this.ensureInitialized();

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildInsertPayload()
    );

    if (!payload.table) {
      throw new Error("Table name is required");
    }

    const table = this.sanitizeTableName(payload.table);
    const data = payload.data || {};

    if (!Object.keys(data).length) {
      throw new Error("Insert data cannot be empty");
    }

    const result = await this.knex(table).insert(data).returning("*");

    return { rows: result, rowCount: result.length } as QueryResult;
  }

  // get the data from the table
  async selectRows(request: any): Promise<QueryResult> {
    await this.ensureInitWithDefaults(request);
    this.ensureInitialized();

    const schema = request?.schemaData ?? [];

    const payload = this.utilityService.buildPayloadFromSchema(
      request?.data,
      schema,
      this.buildSelectPayload()
    );

    if (!payload.query) {
      throw new Error("Query is required");
    }

    payload.query = this.normalizeQuery(payload.query);
    payload.query = this.enforceLimit(payload.query);
    // this.validateBindings(payload.query, payload.params || []);
    return await this.knex.raw(payload.query, payload.params || []);
  }

  // payload helper functions
  private buildInsertPayload() {
    return {
      table: null,
      data: null,
    };
  }

  private buildSelectPayload() {
    return {
      query: null,
      params: null,
    };
  }

  private buildExecuteQueryPayload() {
    return {
      query: null,
      params: null,
    };
  }

  private ensureInitialized() {
    if (!this.knex) {
      throw new Error("Postgres client not initialized. Call init() first.");
    }
  }

  private sanitizeTableName(table: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new Error("Invalid table name");
    }
    return table;
  }

  private enforceLimit(query: string, defaultLimit = 100): string {
    const normalized = query.trim().replace(/;$/, "");

    if (!/^select\s+/i.test(normalized)) {
      return normalized;
    }

    if (/\blimit\b/i.test(normalized)) {
      return normalized;
    }

    return `${normalized} LIMIT ${defaultLimit}`;
  }
  private normalizeQuery(query: string): string {
    return query.replace(/\$\d+/g, "?");
  }
  private async getIntegrationDetails(userId: string) {
    if (!userId) {
      // throw new Error("userId is required to fetch integration credentials");
    }
    console.log(userId);
    const credential =
      await this.integrationDetailService.getIntegrationCredential({
        userId,
        slug: "postgres",
      });

    if (!credential) {
      // throw new Error("Postgres integration not configured for this user");
    }
    if (!credential.auth_detail) {
      // throw new Error("Postgres auth_detail missing");
    }
    const auth = credential.auth_detail;
    if (!auth) {
      // throw new Error("Postgres auth_detail missing");
    }
    return {
      host: auth.host,
      port: Number(auth.port),
      database: auth.database,
      user: auth.username,
      password: auth.password,
      ssl: auth.ssl === true || auth.ssl === "true",
    };
  }

  private validateBindings(query: string, params: any[]) {
    const expected = (query.match(/\?/g) || []).length;
    const actual = params?.length || 0;

    if (expected !== actual) {
      // throw new Error(`Binding mismatch: expected ${expected}, got ${actual}`);
    }
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "executeQuery",
        description: "Execute raw SQL query",
        defaultPayload: this.buildExecuteQueryPayload(),
      },
      {
        action: "insertRow",
        description: "Insert a row into Postgres table",
        defaultPayload: this.buildInsertPayload(),
      },
      {
        action: "selectRows",
        description: "Fetch rows from Postgres",
        defaultPayload: this.buildSelectPayload(),
      },
    ];
  }
}
