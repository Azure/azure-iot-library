/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// A common set of fields present in every event
// ver	Version of the logging schema
// name	Uniquely qualified name for the event uses <company>.<group>.<component>.<subcomponent>
// time	UTC time when the event was generated
// os	Operating system
// osVer	Operating system major and minor version
// appId	Unique identifier of the client application
// appVer	App version for client application
// cV	Correlation Vector - https://osgwiki.com/wiki/CorrelationVector. Identifies and order related events across clients and services.

export class Common {
    constructor(public ver: string,
        public name: string,
        public time: string,
        public os: string,
        public osVer: string,
        public appId: string,
        public appVer: string,
        public cV: string) { }
}
