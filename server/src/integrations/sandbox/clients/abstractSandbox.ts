import { SandboxResult } from "./sandboxClient.js";

export default abstract class AbstractSandboxClient {
  constructor() {
    if (new.target === AbstractSandboxClient) {
      throw new Error("Cannot instantiate AbstractSandboxClient directly");
    }
  }

  abstract code(
    code: string,
    context?: Record<string, any>
  ): Promise<SandboxResult>;

}
