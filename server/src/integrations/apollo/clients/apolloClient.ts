import IntegrationDetailService from "../../../services/IntegrationDetailService.js";
import Utility from "../../../services/Utility.js";
import AbstractApolloClient from "./abstractApolloClient.js";

export default class ApolloClient extends AbstractApolloClient {
  private utilityService?: Utility;
  private integrationService = new IntegrationDetailService();
  private baseUrl = "https://api.apollo.io/v1";

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
      console.warn("Apollo init failed:", err);
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
          slug: "apollo",
        });

      if (!integration?.auth_detail?.api_key) return null;
      return integration.auth_detail;
    } catch (err) {
      console.warn("Fetch Apollo API key failed:", err);
      return null;
    }
  }

  /* =======================
     Request wrapper
  ======================= */
  private async request(
    endpoint: string,
    payload: any,
    request: any,
    method: string = "POST"
  ) {
    const apiKey = await this.init(request);
    if (!apiKey) throw new Error("Apollo API key not found");

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    if (method !== "GET") options.body = JSON.stringify(payload);

    const res = await fetch(`${this.baseUrl}${endpoint}`, options);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Apollo API error: ${res.status} - ${errorText}`);
    }
    return res.json();
  }

  /* =======================
     Search Contacts
  ======================= */
  async searchContacts(request: any) {
    if (!this.utilityService) await this.init(request);

    try {
      const schema = request?.schemaData ?? [];
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        schema,
        this.buildSearchContactsPayload()
      );
      if (payload?.filters && typeof payload?.filters === "string") {
        try {
          payload.filters = JSON.parse(payload.filters);
        } catch (e) {
          payload.filters = {};
        }
      }
      const res = await this.request("/contacts/search", payload, request);
      return res;
    } catch (err) {
      console.warn("searchContacts failed:", err);
      return { contacts: [] };
    }
  }

  buildSearchContactsPayload() {
    return {
      filters: {},
      page: 1,
      per_page: 25,
    };
  }

  /* =======================
     Enrich Contact
  ======================= */
  async enrichContact(request: any) {
    if (!this.utilityService) await this.init(request);

    try {
      const contactId = request?.data?.contactId;
      if (!contactId) throw new Error("contactId is required");

      const schema = request?.schemaData ?? [];
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        schema,
        {}
      );

      const res = await this.request(`/contacts/${contactId}/enrich`, payload, request, "GET");
      return res;
    } catch (err) {
      console.warn("enrichContact failed:", err);
      return {};
    }
  }

  /* =======================
     Search Organizations
  ======================= */
  async searchOrganizations(request: any) {
    if (!this.utilityService) await this.init(request);

    try {
      const schema = request?.schemaData ?? [];
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        schema,
        this.buildSearchOrganizationsPayload()
      );
       if (payload?.filters && typeof payload?.filters === "string") {
        try {
          payload.filters = JSON.parse(payload.filters);
        } catch (e) {
          payload.filters = {};
        }
      }

      const res = await this.request("/organizations/search", payload, request);
      return res;
    } catch (err) {
      console.warn("searchOrganizations failed:", err);
      return { organizations: [] };
    }
  }

  buildSearchOrganizationsPayload() {
    return {
      filters: {},
      page: 1,
      per_page: 25,
    };
  }

  /* =======================
     Add Contact to Sequence
  ======================= */
  async addToSequence(request: any) {
    if (!this.utilityService) await this.init(request);

    try {
      const contactId = request?.data?.contactId;
      const sequenceId = request?.data?.sequenceId;
      if (!contactId || !sequenceId) throw new Error("contactId and sequenceId are required");

      const schema = request?.schemaData ?? [];
      const payload = this.utilityService!.buildPayloadFromSchema(
        request?.data,
        schema,
        this.buildAddToSequencePayload()
      );

      const res = await this.request(`/sequences/${sequenceId}/add`, payload, request);
      return res;
    } catch (err) {
      console.warn("addToSequence failed:", err);
      return {};
    }
  }

  buildAddToSequencePayload() {
    return {
      contact_id: null,
    };
  }

  /* =======================
     Blueprint
  ======================= */
  pairingFunctionNameAndPayload() {
    return [
      {
        action: "searchContacts",
        description: "Search for leads/contacts in Apollo.io",
        defaultPayload: this.buildSearchContactsPayload(),
      },
      {
        action: "enrichContact",
        description: "Enrich a contact with more data",
        defaultPayload: {},
      },
      {
        action: "searchOrganizations",
        description: "Search for companies/organizations",
        defaultPayload: this.buildSearchOrganizationsPayload(),
      },
      {
        action: "addToSequence",
        description: "Add a contact to a sequence for outreach",
        defaultPayload: this.buildAddToSequencePayload(),
      },
    ];
  }
}
