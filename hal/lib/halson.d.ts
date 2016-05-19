declare module 'halson' {
    namespace halson {
        interface HALSONResource {
            listLinkRels(): string[];
            listEmbedRels(): string[];
            getLinks(rel: string, filterCallback?: (link: any) => boolean, begin?: number, end?: number): any[];
            getLink(rel: string, filterCallback?: (link: any) => boolean, def?: any): any;
            getEmbeds(rel: string, filterCallback?: (embed: HALSONResource) => boolean, begin?: number, end?: number): HALSONResource[];
            getEmbed(rel: string, filterCallback?: (embed: HALSONResource) => boolean, def?: any): HALSONResource;
            addLink(rel: string, link: string | Object): this;
            addEmbed(rel: string, embed: Object | HALSONResource): this;
            insertEmbed(rel: string, index: number, embed: Object | HALSONResource): this;
            removeLinks(rel: string, filterCallback?: (link: any) => boolean): this;
            removeEmbeds(rel: string, filterCallback?: (link: HALSONResource) => boolean): this;
        }
    }

    function halson(data: string | Object): halson.HALSONResource;

    export = halson;
}