/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import onHeaders = require('on-headers');

import {ILogger} from '../../common/loggers/Ilogger';
import {IncomingServiceRequest} from '../../common/events/incomingServiceRequest';
import {Exception} from '../../common/events/exception';
import {RequestStatus} from '../../common/events/eventField';

export class ExpressMiddleware {

    // Middleware function for logging ISRs in an Express server.
    //
    // NOTE: this function takes an operationName and version as parameters and
    // should therefore be included on each route, rather than once on the
    // entire application
    public static logISR(logger: ILogger, operationName: string, operationVersion: string) {

        return (req, res, next) => {
            let startTime = process.hrtime();

            onHeaders(res, () => {
                // Returns time in format [seconds, nanoseconds]
                let duration = process.hrtime(startTime);
                let durationMs = Math.floor((duration[0] * 1e3) + (duration[1] / 1e6));

                logger.informational(new IncomingServiceRequest(
                    operationName,
                    req.method,
                    res.statusCode,
                    durationMs,
                    [], // TODO: get headers
                    req.hostname,
                    req.originalUrl || req.url,
                    RequestStatus.OK,
                    res.get('Content-Type'),
                    req.protocol,
                    res.statusCode,
                    '', // TODO: get response body
                    req.get('Content-Length'),
                    operationVersion,
                    req.ip,
                    req.get('User-Agent')
                ));
            });

            next();
        };
    }

    // Middleware function for logging uncaught Exceptions in an Express server.
    //
    // NOTE: Error handling middleware should always be included after all other
    // application middleware
    public static logExceptions(logger: ILogger) {
        return (err, req, res, next) => {
            if (err) {
                logger.error(new Exception(
                    err.name || undefined,
                    err.message || err.toString(),
                    1, // TODO: get error severity
                    err.syscall || undefined,
                    err.errno || undefined, // TODO: get error code
                    undefined, // TODO: get error line number
                    false, // TODO: figure out whether the error is displayed
                    err.stack || undefined, // TODO: get location of the error
                    err.syscall || undefined,
                    'anonymous' // TODO: get name of user that made the request
                ));
            }

            next(err);
        };
    }
}
