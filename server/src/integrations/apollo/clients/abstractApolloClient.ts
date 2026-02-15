export default abstract class AbstractApolloClient {
  constructor() {
    if (new.target === AbstractApolloClient) {
      throw new Error("Cannot instantiate AbstractApolloClient directly");
    }
  }

  abstract searchContacts(request: any): Promise<any>;
  abstract enrichContact(request: any): Promise<any>;
  abstract searchOrganizations(request: any): Promise<any>;
  abstract addToSequence(request: any): Promise<any>;
}
