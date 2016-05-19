/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as EventField from './eventField';

export abstract class ServiceRequest {
    constructor(public operationName: string,
        public requestMethod: string,
        public responseStatusCode: number,
        public latencyMs: number,
        public headers: string[],
        public hostname: string,
        public requestUri?: string,
        public requestStatus?: EventField.RequestStatus,
        public responseContentType?: string,
        public protocol?: string,
        public protocolStatusCode?: string,
        public responseBody?: string) {
    }
}
