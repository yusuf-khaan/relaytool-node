import { NextFunction, Request, Response } from "express";
import IntegrationService from "../services/integrationService.js";
import IntegrationDetailService from "../services/IntegrationDetailService.js";

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
    const provider: string = req.body?.provider || "";

    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    try {
      const result =
        await this.integrationService.getProviderMetadata(provider);
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching metadata:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  async getProcessingKeys(req: Request, res: Response) {
    // Prefer body provider; fallback to params
    const provider: string = req.body?.provider || req.params.provider || "";

    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    console.log("Provider param:", provider);

    try {
      const result =
        await this.integrationService.getIntegrationProcessingKeys(provider);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getIntegrrationCreds(req: Request, res: Response) {
    try {
      const body = req?.body;
      const result =  await this.integrationDetailService.getIntegrationCredential(body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new IntegrationController();
