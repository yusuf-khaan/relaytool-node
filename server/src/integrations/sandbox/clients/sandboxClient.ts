import { NodeVM } from "vm2";
import axios from "axios";
import AbstractSandboxClient from "./abstractSandbox.js";
import IntegrationDetailService from "../../../services/IntegrationDetailService.js";

export interface SandboxResult {
  success: boolean;
  result?: any;
  console?: any[];
  error?: string;
  executionTime?: number;
}

type AllowedHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ThirdPartyRequest {
  url: string;
  method?: AllowedHttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeoutMs?: number;
}

class SandboxClient extends AbstractSandboxClient {
  private readonly defaultHttpTimeoutMs = 10000;
  private readonly maxHttpTimeoutMs = 30000;
  private readonly allowedHttpMethods = new Set<AllowedHttpMethod>([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ]);
  private integrationDetailService = new IntegrationDetailService();

  constructor() {
    super();
  }

  resolveSchemaCustomLogic(customLogic: any, inputData: any): any {
    if (!this.shouldExecuteCustomLogic(customLogic)) {
      return customLogic;
    }

    const code = this.extractSchemaCustomLogicCode(customLogic);
    if (!code) {
      return null;
    }

    const vm = this.createVm(inputData ?? {}, 3000);
    this.attachConsoleCapture(vm);
    const wrappedCode = this.createSmartWrapper(code, {
      asyncExecution: false,
      exposeInputAlias: true,
      exposeThirdPartyAlias: true,
      exposeNodeDataHelpers: true,
    });
    const result = vm.run(wrappedCode)();
    if (result && typeof result.then === "function") {
      throw new Error(
        "Async customLogic is not supported in schema mapping. Use sync logic only in schemaData.",
      );
    }
    return result;
  }

  /**
   * Executes user-provided JavaScript code in a sandboxed environment
   * @param input The input object containing code or directly the code string
   * @returns SandboxResult with the result, console output, or error
   */
  async code(request: any): Promise<any> {
    const startTime = Date.now();
    console.log("SandboxClient.code - Received request:", request);
    const schemaData = request?.schemaData[0] ?? {};
    const data = schemaData?.customLogic ?? null;
    console.log("SandboxClient.code - Received data:", data);

    try {
      const code = this.extractCode(data);

      if (!code || code.trim().length === 0) {
        throw new Error("Code cannot be empty");
      }

      const inputData = request?.data || {};
      const vm = this.createVm(inputData, 5000);
      this.attachConsoleCapture(vm);

      const wrappedCode = this.createSmartWrapper(code, {
        asyncExecution: true,
        exposeInputAlias: false,
        exposeThirdPartyAlias: false,
        exposeNodeDataHelpers: true,
      });
      const result = await vm.run(wrappedCode)();
      void startTime;

      // return {
      //   success: true,
      //   result: result !== undefined ? result : null,
      //   console: consoleOutput,
      //   executionTime,
      // };
      return result;
    } catch (err: any) {
      void startTime;
      // return {
      //   success: false,
      //   error: err.message || "An error occurred while executing the code",
      //   console: [],
      //   executionTime,
      // };
      return { error: (err.message || "An error occurred while executing the code") };
    }
  }

  /**
   * Extract code from various input formats
   */
  private extractCode(input: any): string {
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') {
      return input?.data || null;
    }
    return String(input);
  }

  private shouldExecuteCustomLogic(customLogic: any): boolean {
    if (!customLogic) return false;

    if (typeof customLogic === "string") {
      const trimmed = customLogic.trim().toLowerCase();
      return trimmed.startsWith("js:") || trimmed.startsWith("javascript:");
    }

    if (typeof customLogic === "object") {
      const mode = String(
        customLogic?.type ??
        customLogic?.mode ??
        customLogic?.language ??
        "",
      )
        .trim()
        .toLowerCase();

      return (
        mode === "js" ||
        mode === "javascript" ||
        (typeof customLogic?.code === "string" &&
          customLogic.code.trim().length > 0)
      );
    }

    return false;
  }

  private extractSchemaCustomLogicCode(customLogic: any): string {
    if (typeof customLogic === "string") {
      const trimmed = customLogic.trim();
      if (/^javascript:/i.test(trimmed)) {
        return trimmed.replace(/^javascript:/i, "").trim();
      }
      if (/^js:/i.test(trimmed)) {
        return trimmed.replace(/^js:/i, "").trim();
      }
      return "";
    }

    if (
      typeof customLogic === "object" &&
      typeof customLogic?.code === "string"
    ) {
      return customLogic.code.trim();
    }

    return "";
  }

  /**
   * Smart wrapper that detects and handles both expressions and return statements
   */
  private createSmartWrapper(
    code: string,
    options: {
      asyncExecution: boolean;
      exposeInputAlias: boolean;
      exposeThirdPartyAlias: boolean;
      exposeNodeDataHelpers: boolean;
    },
  ): string {
    const clean = code.trim();
    const asyncKeyword = options.asyncExecution ? "async " : "";
    const awaitKeyword = options.asyncExecution ? "await " : "";
    const inputAlias = options.exposeInputAlias
      ? "\n  const input = __jsonPayload;"
      : "";
    const thirdPartyAlias = options.exposeThirdPartyAlias
      ? "\n  globalThis.__callThirdParty = (payload) => __callThirdParty(payload);"
      : "";
    const nodeDataHelpers = options.exposeNodeDataHelpers
      ? "\n  globalThis.getNodeInputData = (nodeId) => __getNodeInputData(nodeId);\n  globalThis.getNodeOutputData = (nodeId) => __getNodeOutputData(nodeId);"
      : "";

    return `
module.exports = ${asyncKeyword}() => {
  globalThis.getJsonPayloadRecieved = () => __jsonPayload;
  globalThis.callThirdParty = (payload) => __callThirdParty(payload);
  ${thirdPartyAlias}${inputAlias}${nodeDataHelpers}

  let __result;

  try {
    __result = ${awaitKeyword}(${asyncKeyword}function() {
      ${clean}
    })();
  } catch (err) {
    throw err;
  }

  return __result;
};
`;
  }

  private createVm(inputData: any, timeout: number): NodeVM {
    return new NodeVM({
      console: "redirect",
      timeout,
      eval: false,
      wasm: false,
      require: false,
      sandbox: {
        __jsonPayload: inputData,
        getJsonPayloadRecieved: () => inputData,
        __callThirdParty: (payload: ThirdPartyRequest) =>
          this.callThirdParty(payload),
        __getNodeInputData: (nodeId: any) =>
          this.getExecutionNodeData(inputData, nodeId, true),
        __getNodeOutputData: (nodeId: any) =>
          this.getExecutionNodeData(inputData, nodeId, false),
      },
    });
  }

  private async getExecutionNodeData(
    requestContext: any,
    nodeId: any,
    wantInput: boolean,
  ): Promise<any> {
    return this.integrationDetailService.getExecutionNodeData(
      requestContext,
      nodeId,
      wantInput,
    );
  }

  private attachConsoleCapture(vm: NodeVM): any[] {
    const consoleOutput: any[] = [];

    vm.on("console.log", (...args) => {
      const out = args.map((a) => {
        if (a === null) return null;

        if (typeof a === "object") {
          try {
            return JSON.parse(JSON.stringify(a));
          } catch {
            return "[Unserializable Object]";
          }
        }

        if (typeof a === "string") return a;
        if (typeof a === "number") return a;
        if (typeof a === "boolean") return a;

        return String(a);
      });

      consoleOutput.push(out.length === 1 ? out[0] : out);
    });

    vm.on("console.error", (...args) =>
      consoleOutput.push("ERROR: " + args.join(" ")),
    );
    vm.on("console.warn", (...args) =>
      consoleOutput.push("WARN: " + args.join(" ")),
    );
    vm.on("console.info", (...args) =>
      consoleOutput.push("INFO: " + args.join(" ")),
    );

    return consoleOutput;
  }

  private async callThirdParty(payload: ThirdPartyRequest): Promise<any> {
    if (!payload || typeof payload !== "object") {
      throw new Error("callThirdParty payload must be an object");
    }

    if (!payload.url || typeof payload.url !== "string") {
      throw new Error("callThirdParty requires a valid 'url' string");
    }

    const targetUrl = new URL(payload.url);
    if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
      throw new Error("Only http/https URLs are allowed");
    }

    this.validateHost(targetUrl.hostname);

    const method = (payload.method || "GET").toUpperCase() as AllowedHttpMethod;
    if (!this.allowedHttpMethods.has(method)) {
      throw new Error(`HTTP method '${method}' is not allowed`);
    }

    const timeoutMs = Math.min(
      Math.max(1000, payload.timeoutMs || this.defaultHttpTimeoutMs),
      this.maxHttpTimeoutMs
    );

    const response = await axios.request({
      url: targetUrl.toString(),
      method,
      headers: this.sanitizeHeaders(payload.headers),
      params: payload.params,
      data: payload.data,
      timeout: timeoutMs,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    return {
      status: response.status,
      headers: response.headers,
      data: response.data,
    };
  }

  private validateHost(hostname: string): void {
    const allowList = this.getAllowedHostPatterns();

    if (allowList.length === 0) {
      throw new Error(
        "No third-party hosts are configured. Set SANDBOX_ALLOWED_HTTP_HOSTS with a comma-separated allowlist."
      );
    }

    const normalized = hostname.toLowerCase();

    const matched = allowList.some((pattern) => {
      if (pattern.startsWith("*.")) {
        const suffix = pattern.slice(1).toLowerCase();
        return normalized.endsWith(suffix);
      }
      return normalized === pattern.toLowerCase();
    });

    if (!matched) {
      throw new Error(`Host '${hostname}' is not allowed`);
    }

    if (this.isPrivateNetworkHostname(normalized)) {
      throw new Error(`Host '${hostname}' resolves to a private or loopback network range`);
    }
  }

  private getAllowedHostPatterns(): string[] {
    const raw = process.env.SANDBOX_ALLOWED_HTTP_HOSTS || "";
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};

    const blocked = new Set(["host", "connection", "content-length", "transfer-encoding"]);
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (blocked.has(lower)) continue;
      sanitized[key] = String(value);
    }

    return sanitized;
  }

  private isPrivateNetworkHostname(hostname: string): boolean {
    if (hostname === "localhost" || hostname === "::1") {
      return true;
    }

    if (hostname.startsWith("127.")) return true;
    if (hostname.startsWith("10.")) return true;
    if (hostname.startsWith("192.168.")) return true;
    if (hostname.startsWith("169.254.")) return true;
    if (hostname.startsWith("fc") || hostname.startsWith("fd")) return true;

    if (hostname.startsWith("172.")) {
      const parts = hostname.split(".");
      const secondOctet = Number(parts[1]);
      if (!Number.isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }

    return false;
  }

  /**
   * Universal wrapper that handles all cases reliably
   */
  private createUniversalWrapper(code: string): string {
    const cleanCode = code.trim();

    // Always use the safe approach that works for both cases
    return `
      module.exports = async () => {
        let __result;
        try {
          // First try: wrap in function to handle return statements
          __result = (function() { 
            ${cleanCode} 
          })();
        } catch (e1) {
          try {
            // Second try: direct expression
            __result = (${cleanCode});
          } catch (e2) {
            // Third try: just execute (for side effects)
            ${cleanCode}
          }
        }
        return __result;
      };
    `;
  }

  /**
   * Simple runner - alias for javaScriptCodeRunner
   */
  async simpleJavaScriptRunner(input: any): Promise<SandboxResult> {
    return this.code(input);
  }

  /**
   * Create safe wrapper - exposed for provider actions
   */
  async createSafeWrapper(input: any): Promise<SandboxResult> {
    try {
      const code = this.extractCode(input);
      const wrapped = this.createUniversalWrapper(code);
      return {
        success: true,
        result: wrapped,
        console: [],
        executionTime: 0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        console: [],
        executionTime: 0
      };
    }
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "code",
        description: "A javascript compiler with safe third-party HTTP helper via callThirdParty(...)",
        defaultPayload: {
          "code": null
        },
      },
    ];
  }
}

export default SandboxClient;
