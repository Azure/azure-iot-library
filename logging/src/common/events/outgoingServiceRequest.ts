/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Informational event used to measure the performance of service API calls and returned reponses from the caller prospective.
// operationName	The mnemonic name of the current operation
// requestUri	The full URI of the operation called including query parameters
// requestMethod	ENUM of HTTP request method. Example: "GET", "POST"
// requestStatus	The status of the request.
// responseStatusCode	The internal error code of the operation
// responseContentType	Example: "application/json"
// responseSize	The response size in bytes.
// latencyMs	The duration in milliseconds between start and stop of operation
// protocol	Name of transport protocol. Example: "HTTP", "HTTPs"
// protocolStatusCode	HTTP protocol status code
// dependencyOperationName	The mnemonic name of the dependency operation
// dependencyOperationVersion	The version of the dependency operation
// dependencyName	The name of the service
// dependencyType	The type of the called resources
// headers	(excluding configured ones, i.e. “Authorization” or “Cookie”)
// responseBody	(or configurable part of it, if it’s too large) (when it makes sense)
// hostname	it’s in addition to URI for faster investigations and stats
// succeeded whether or not the operation succeeded

import {ServiceRequest} from './serviceRequest';
import * as EventField from './eventField';

export class OutgoingServiceRequest extends ServiceRequest {
    private eventType: string = EventField.EventType[EventField.EventType.OutgoingServiceRequest];
    constructor(public operationName: string,
        public latencyMs: number,
        public hostname: string,
        public succeeded: boolean,
        public requestMethod?: string,
        public responseStatusCode?: number,
        public headers?: string[],
        public requestUri?: string,
        public requestStatus?: EventField.RequestStatus,
        public responseContentType?: string,
        public protocol?: string,
        public protocolStatusCode?: string,
        public responseBody?: string,
        public responseSize?: number,
        public dependencyOperationName?: string,
        public dependencyOperationVersion?: string,
        public dependencyName?: string,
        public dependencyType?: string
    ) {
        super(operationName,
            requestMethod,
            responseStatusCode,
            latencyMs,
            headers,
            hostname,
            requestUri,
            requestStatus,
            responseContentType,
            protocol,
            protocolStatusCode,
            responseBody);
    }
}
