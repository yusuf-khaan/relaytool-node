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
      filters: null,
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
      filters: null,
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

  async createContact(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildCreateContactPayload()
    );

    return this.request("/contacts/create", payload, request);
  }

  async updateContact(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildUpdateContactPayload()
    );

    return this.request("/contacts/update", payload, request);
  }

  async bulkCreateContacts(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildBulkContactsPayload()
    );

    return this.request("/contacts/bulk_create", payload, request);
  }

  async bulkUpdateContacts(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildBulkContactsPayload()
    );

    return this.request("/contacts/bulk_update", payload, request);
  }

  async searchAccounts(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildSearchAccountsPayload()
    );

    return this.request("/accounts/search", payload, request);
  }

  async bulkCreateAccounts(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildBulkAccountsPayload()
    );

    return this.request("/accounts/bulk_create", payload, request);
  }

  async matchPerson(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildMatchPersonPayload()
    );

    return this.request("/people/match", payload, request);
  }

  async bulkMatchPeople(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildBulkMatchPeoplePayload()
    );

    return this.request("/people/bulk_match", payload, request);
  }

  async showPerson(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildShowPersonPayload()
    );

    if (!payload.person_id) throw new Error("person_id required");

    return this.request(
      `/people/show?person_id=${payload.person_id}`,
      {},
      request,
      "GET"
    );
  }

  async showOrganization(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildShowOrganizationPayload()
    );

    if (!payload.organization_id)
      throw new Error("organization_id required");

    return this.request(
      `/organizations/show?organization_id=${payload.organization_id}`,
      {},
      request,
      "GET"
    );
  }

  async enrichOrganization(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildShowOrganizationPayload()
    );

    return this.request("/organizations/enrich", payload, request);
  }

  async bulkEnrichOrganizations(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildBulkEnrichOrganizationsPayload()
    );

    return this.request("/organizations/bulk_enrich", payload, request);
  }

  async organizationJobPostings(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildOrganizationJobPostingsPayload()
    );

    return this.request("/organizations/job_postings", payload, request);
  }

  async mixedCompaniesSearch(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildMixedSearchPayload()
    );

    return this.request("/mixed_companies/search", payload, request);
  }

  async mixedPeopleSearch(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildMixedSearchPayload()
    );

    return this.request("/mixed_people/api_search", payload, request);
  }

  async organizationTopPeople(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildShowOrganizationPayload()
    );

    return this.request(
      "/mixed_people/organization_top_people",
      payload,
      request
    );
  }

  async syncReport(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildSyncReportPayload()
    );

    return this.request("/reports/sync_report", payload, request);
  }

  async createField(request: any) {
    if (!this.utilityService) await this.init(request);

    const payload = this.utilityService!.buildPayloadFromSchema(
      request?.data,
      request?.schemaData ?? [],
      this.buildCreateFieldPayload()
    );

    return this.request("/fields/create", payload, request);
  }

  buildCreateContactPayload() {
    return {
      first_name: null,
      last_name: null,
      email: null,
      organization_name: null,
    };
  }

  buildUpdateContactPayload() {
    return {
      id: null,
      first_name: null,
      last_name: null,
      email: null,
    };
  }

  buildBulkContactsPayload() {
    return {
      contacts:null,
    };
  }

  buildSearchAccountsPayload() {
    return {
      filters: null,
      page: 1,
      per_page: 25,
    };
  }

  buildBulkAccountsPayload() {
    return {
      accounts: null,
    };
  }

  buildMatchPersonPayload() {
    return {
      email: null,
      first_name: null,
      last_name: null,
      organization_name: null,
    };
  }

  buildBulkMatchPeoplePayload() {
    return {
      people: null,
    };
  }

  buildShowPersonPayload() {
    return {
      person_id: null,
    };
  }

  buildShowOrganizationPayload() {
    return {
      organization_id: null,
    };
  }

  buildBulkEnrichOrganizationsPayload() {
    return {
      organizations: null,
    };
  }

  buildOrganizationJobPostingsPayload() {
    return {
      organization_id: null,
    };
  }

  buildMixedSearchPayload() {
    return {
      filters: null,
      page: 1,
      per_page: 25,
    };
  }

  buildSyncReportPayload() {
    return {
      report_id: null,
    };
  }

  buildCreateFieldPayload() {
    return {
      name: null,
      field_type: null,
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
      {
        action: "createContact",
        description: "Create a new contact in Apollo",
        defaultPayload: this.buildCreateContactPayload(),
      },
      {
        action: "bulkCreateContacts",
        description: "Bulk create contacts",
        defaultPayload: this.buildBulkContactsPayload(),
      },
      {
        action: "searchAccounts",
        description: "Search accounts in Apollo",
        defaultPayload: this.buildSearchAccountsPayload(),
      },
      {
        action: "matchPerson",
        description: "Match a person via email/domain",
        defaultPayload: this.buildMatchPersonPayload(),
      },
      {
        action: "mixedPeopleSearch",
        description: "Search people across datasets",
        defaultPayload: this.buildMixedSearchPayload(),
      },
      {
        action: "syncReport",
        description: "Sync Apollo report",
        defaultPayload: this.buildSyncReportPayload(),
      },
      {
        action: "createField",
        description: "Create custom field in Apollo",
        defaultPayload: this.buildCreateFieldPayload(),
      },
    ];
  }
}
