import { NextFunction, Request, Response } from "express";
import IntegrationService from "../services/integrationService.js";
import IntegrationDetailService from "../services/IntegrationDetailService.js";
import { ProviderName } from "../services/ProviderRepository.js";

class IntegrationController {
  private integrationService = new IntegrationService();
  private integrationDetailService = new IntegrationDetailService();

  async execute(req: Request, res: Response, next: NextFunction) {
    // Enforce provider and action as strings
    const provider: string = req.params.provider || "";
    const action: string = req.params.action || "";
    const params = req.body || {};

    if (!provider || !action) {
      return res
        .status(400)
        .json({ error: "Provider and action are required" });
    }

    try {
      const result = await this.integrationService.execute(
        provider,
        action,
        params,
      );
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }

  async getProviderMetadata(req: Request, res: Response) {
    const providerInput: string | string[] = req.body?.provider;
    if (!providerInput || (Array.isArray(providerInput) && providerInput.length === 0)) {
      return res.status(400).json({ error: "Provider is required" });
    }
    const providers = Array.isArray(providerInput) ? providerInput : [providerInput];
    const allowedProviders: ProviderName[] = [
      "gmail", "gemini", "x", "discord", "instagram", "jira", "openai", "postgres", "sandbox", "teams", "telegram", "twilio", "apollo"
    ];
    const validProviders = providers.filter((p): p is ProviderName => allowedProviders.includes(p as ProviderName));
    if (validProviders.length === 0) {
      return res.status(400).json({ error: "No valid providers provided" });
    }
    try {
      const result = await this.integrationService.getProviderMetadata(validProviders);
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching metadata:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  async getIntegrrationCreds(req: Request, res: Response) {
    try {
      const body = req?.body;
      const result = await this.integrationDetailService.getIntegrationCredential(body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new IntegrationController();
