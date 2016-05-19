/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Informational event used to measure the service request that have been received and processed from the callee perspective.
// operationName	The mnemonic name of the current operation
// requestUri	The full URI of the operation called including query parameters
// requestMethod	ENUM of HTTP request method. Example: "GET", "POST"
// requestStatus	The status of the request. Example: ?
// requestSize	The request size in bytes.
// responseStatusCode	The internal error code of the operation
// responseContentType	Example: "application/json"
// latencyMs	The duration in milliseconds between start and stop of operation
// protocol	Name of transport protocol. Example: "HTTP", "HTTPs"
// protocolStatusCode	HTTP protocol status code. Example: ?
// operationVersion	The version of the current operation
// callerIpAddress	The IP Address of the caller.
// callerName	The name of the caller (should be a value with a bounded range). Do not log transient / ever-increasing values (for example: user agent strings, etc.)
// headers	(excluding configured ones, i.e. “Authorization” or “Cookie”)
// responseBody	(or configurable part of it, if it’s too large) (when it makes sense)
// hostname	it’s in addition to URI for faster investigations and stats

import {ServiceRequest} from './serviceRequest';
import * as EventField from './eventField';

export class IncomingServiceRequest extends ServiceRequest {
    private eventType: string = EventField.EventType[EventField.EventType.IncomingServiceRequest];

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
        public responseBody?: string,
        public requestSize?: number,
        public operationVersion?: string,
        public callerIpAddress?: string,
        public callerName?: string
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
