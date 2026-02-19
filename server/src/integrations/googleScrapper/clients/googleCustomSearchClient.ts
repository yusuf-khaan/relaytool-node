import IntegrationDetailService from "../../../services/IntegrationDetailService.js";
import Utility from "../../../services/Utility.js";
import AbstractgoogleCustomSearchClient from "./abstractGoogleCustomSearchClient.js";

export default class googleCustomSearchClient extends AbstractgoogleCustomSearchClient {
  private utilityService?: Utility;
  private integrationService = new IntegrationDetailService();

  constructor() {
    super();
  }

  /* =======================
     Init
  ======================= */
  async init(request: any): Promise<string | null> {
    try {
      this.utilityService = new Utility();

      const userId = request?.data?.userId || request?.userId;
      if (!userId) return null;

      const token = await this.fetchTokenFromDB(userId);
      return token?.api_key || null;
    } catch (err) {
      console.warn("Google Scrapper init failed:", err);
      return null;
    }
  }

  /* =======================
     Fetch API Key from DB
  ======================= */
  private async fetchTokenFromDB(userId: string): Promise<any> {
    try {
      const integration =
        await this.integrationService.getIntegrationCredential({
          userId,
          slug: "google-scrapper",
        });

      if (!integration?.auth_detail?.api_key) return null;
      return integration.auth_detail;
    } catch (err) {
      return null;
    }
  }

  pairingFunctionNameAndPayload() {
    return [
      {
        action: "scrapeGoogle",
        description: "Scrape Google search results",
        defaultPayload: [],
      },
    ];
  }
}
