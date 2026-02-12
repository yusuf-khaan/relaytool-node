import AbstractNodesClient from "./abstractNodesClient.js";

class NodesClient extends AbstractNodesClient { 
    async executeByType(request:any): Promise<any> {
        const payload = request?.payload;
        const config = request?.config || {};
        const type = config?.type || "default";

        if(type === "splitOut"){
            return this.executeSplitOutNode(config, payload);
        } else if(type === "transform"){
            return this.executeTransformNode(config, payload);
        } else if(type === "aggregate"){

        }
    }
    async executeSplitOutNode(config:any, payload:any): Promise<any> {

    }

    async executeTransformNode(config:any, payload:any): Promise<any> {
    }
}
export default NodesClient;
