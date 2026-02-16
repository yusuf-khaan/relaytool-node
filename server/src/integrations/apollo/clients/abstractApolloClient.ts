export default abstract class AbstractApolloClient {
  constructor() {
    if (new.target === AbstractApolloClient) {
      throw new Error("Cannot instantiate AbstractApolloClient directly");
    }
  }

  abstract searchContacts(request: any): Promise<any>;
  abstract enrichContact(request: any): Promise<any>;
  abstract createContact(request: any): Promise<any>;
  abstract updateContact(request: any): Promise<any>;
  abstract bulkCreateContacts(request: any): Promise<any>;
  abstract bulkUpdateContacts(request: any): Promise<any>;
  abstract searchAccounts(request: any): Promise<any>;
  abstract bulkCreateAccounts(request: any): Promise<any>;
  abstract matchPerson(request: any): Promise<any>;
  abstract bulkMatchPeople(request: any): Promise<any>;
  abstract showPerson(request: any): Promise<any>;
  abstract searchOrganizations(request: any): Promise<any>;
  abstract showOrganization(request: any): Promise<any>;
  abstract enrichOrganization(request: any): Promise<any>;
  abstract bulkEnrichOrganizations(request: any): Promise<any>;
  abstract organizationJobPostings(request: any): Promise<any>;
  abstract mixedCompaniesSearch(request: any): Promise<any>;
  abstract mixedPeopleSearch(request: any): Promise<any>;
  abstract organizationTopPeople(request: any): Promise<any>;
  abstract addToSequence(request: any): Promise<any>;
  abstract syncReport(request: any): Promise<any>;
  abstract createField(request: any): Promise<any>;
}
