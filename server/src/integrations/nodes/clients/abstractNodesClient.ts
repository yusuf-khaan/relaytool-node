export default abstract class AbstractNodesClient {
    abstract executeByType(request: any): Promise<any>;
}