import { NodeVM } from "vm2";
import AbstractSandboxClient from "./abstractSandbox.js";

export interface SandboxResult {
  success: boolean;
  result?: any;
  console?: any[];
  error?: string;
  executionTime?: number;
}

class SandboxClient extends AbstractSandboxClient {
  constructor() {
    super();
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

      const inputData = request?.data || {};  // <-- this is the real payload
      const vm = new NodeVM({
        console: "redirect",
        timeout: 5000,
        eval: false,
        wasm: false,
        require: false,
        sandbox: {
          __jsonPayload: inputData,
          getJsonPayloadRecieved: () => inputData
        }
      });


      let consoleOutput: any[] = [];
      vm.on("console.log", (...args) => {
        const out = args.map(a => {
          if (a === null) return null;

          if (typeof a === "object") {
            // Return object directly
            try {
              return JSON.parse(JSON.stringify(a));
            } catch (e) {
              return "[Unserializable Object]";
            }
          }

          if (typeof a === "string") return a;
          if (typeof a === "number") return a;
          if (typeof a === "boolean") return a;

          return String(a); // fallback for symbols/functions
        });

        // If only 1 argument, return that argument directly.
        consoleOutput.push(out.length === 1 ? out[0] : out);
      });


      vm.on("console.error", (...args) => consoleOutput.push('ERROR: ' + args.join(' ')));
      vm.on("console.warn", (...args) => consoleOutput.push('WARN: ' + args.join(' ')));
      vm.on("console.info", (...args) => consoleOutput.push('INFO: ' + args.join(' ')));

      const wrappedCode = this.createSmartWrapper(code);
      const result = await vm.run(wrappedCode)();
      const executionTime = Date.now() - startTime;

      // return {
      //   success: true,
      //   result: result !== undefined ? result : null,
      //   console: consoleOutput,
      //   executionTime,
      // };
      return result;
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      // return {
      //   success: false,
      //   error: err.message || "An error occurred while executing the code",
      //   console: [],
      //   executionTime,
      // };
      return {error : (err.message || "An error occurred while executing the code")};
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

  /**
   * Smart wrapper that detects and handles both expressions and return statements
   */
  private createSmartWrapper(code: string): string {
    const clean = code.trim();

    return `
module.exports = async () => {
  globalThis.getJsonPayloadRecieved = () => __jsonPayload;

  let __result;

  try {
    // Always treat input as full JS code (statements allowed)
    __result = (function() {
      ${clean}
    })();
  } catch (err) {
    throw err;
  }

  return __result;
};
`;
  }





  /**
   * Detect if code contains return statement at top level
   */
  private hasReturnStatement(code: string): boolean {
    // Simple detection for return statements that are not inside strings or comments
    const returnRegex = /(^|\s)return\s+/;
    return returnRegex.test(code) && !this.isInStringOrComment(code, returnRegex);
  }

  /**
   * Check if a pattern is inside a string or comment
   */
  private isInStringOrComment(code: string, pattern: RegExp): boolean {
    // Simple check - if the code has strings or comments before the pattern
    // This is a basic implementation and might need refinement for complex cases
    const match = code.match(pattern);
    if (!match) return false;

    const index = match.index!;
    const before = code.substring(0, index);

    // Check for unclosed strings or comments
    const singleQuotes = (before.match(/'/g) || []).length;
    const doubleQuotes = (before.match(/"/g) || []).length;
    const backticks = (before.match(/`/g) || []).length;
    const lineComments = (before.match(/\/\//g) || []).length;
    const blockComments = (before.match(/\/\*/g) || []).length - (before.match(/\*\//g) || []).length;

    return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backticks % 2 === 1) ||
      (lineComments > 0) || (blockComments > 0);
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
        description: "A javascript compiler",
        defaultPayload: {
          "code": null
        },
      },
    ];
  }
}

export default SandboxClient;