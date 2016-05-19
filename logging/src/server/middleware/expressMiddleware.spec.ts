/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {ILogger} from '../../common/loggers/Ilogger';
import {ExpressMiddleware} from './expressMiddleware';

describe('ExpressMiddleware', () => {

    let logger: ILogger;

    beforeEach(() => {
        logger = jasmine.createSpyObj('logger', [
            'emergency',
            'alert',
            'critical',
            'error',
            'warning',
            'notice',
            'informational',
            'debug'
        ]);
    })

    describe('#logExceptions', () => {
        let request;
        let response;
        let next: (err: any) => void;
        let middleware;

        beforeEach(() => {
            request = {};
            response = {};
            next = jasmine.createSpy('next');
            middleware = ExpressMiddleware.logExceptions(logger);
        });

        it('Logs nothing when there is no error', () => {
            let error = null;

            middleware(error, request, response, next);

            // None of the log methods should be called
            expect(logger.emergency).not.toHaveBeenCalled();
            expect(logger.alert).not.toHaveBeenCalled();
            expect(logger.critical).not.toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
            expect(logger.warning).not.toHaveBeenCalled();
            expect(logger.notice).not.toHaveBeenCalled();
            expect(logger.informational).not.toHaveBeenCalled();
            expect(logger.debug).not.toHaveBeenCalled();

            // Next should be called with the error
            expect(next).toHaveBeenCalledWith(error);
        });

        it('Logs the entire error to errorDetails when the error is not an Error object', () => {
            let error = 'This is an error';

            middleware(error, request, response, next);

            // Error should be called
            expect(logger.error).toHaveBeenCalledWith(jasmine.objectContaining({
                errorDetails: error
            }));

            // None of the other log methods should be called
            expect(logger.emergency).not.toHaveBeenCalled();
            expect(logger.alert).not.toHaveBeenCalled();
            expect(logger.critical).not.toHaveBeenCalled();
            expect(logger.warning).not.toHaveBeenCalled();
            expect(logger.notice).not.toHaveBeenCalled();
            expect(logger.informational).not.toHaveBeenCalled();
            expect(logger.debug).not.toHaveBeenCalled();

            // Next should be called with the error
            expect(next).toHaveBeenCalledWith(error);
        });

        it('Logs the details of the error when the error is a node.js Error object', () => {
            let errorMessage = 'Something went wrong'
            let error = new Error(errorMessage);

            middleware(error, request, response, next);

            // Error should be called
            expect(logger.error).toHaveBeenCalledWith(jasmine.objectContaining({
                errorName: error.name,
                errorDetails: errorMessage,
                errorLocation: error.stack
            }));

            // None of the other log methods should be called
            expect(logger.emergency).not.toHaveBeenCalled();
            expect(logger.alert).not.toHaveBeenCalled();
            expect(logger.critical).not.toHaveBeenCalled();
            expect(logger.warning).not.toHaveBeenCalled();
            expect(logger.notice).not.toHaveBeenCalled();
            expect(logger.informational).not.toHaveBeenCalled();
            expect(logger.debug).not.toHaveBeenCalled();

            // Next should be called with the error
            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('#logISR', () => {
        let operationName: string;
        let operationVersion: string;

        let request;
        let response;
        let next: (err: any) => void;
        let middleware;

        beforeEach(() => {
            operationName = 'Incoming Call';
            operationVersion = '1.0';

            request = jasmine.createSpyObj('request', ['get']);
            response = {
                writeHead: () => {},
                get: jasmine.createSpy('get'),
                setHeader: jasmine.createSpy('setHeader')
            };
            next = jasmine.createSpy('next');
            middleware = ExpressMiddleware.logISR(logger, operationName, operationVersion);
        });

        it('Does nothing before the ISR completes', () => {
            middleware(request, response, next);

            // It should not be getting information from the request and response
            expect(request.get).not.toHaveBeenCalled();
            expect(response.get).not.toHaveBeenCalled();

            // It should not log an informational request
            expect(logger.informational).not.toHaveBeenCalled();

            // It should not log anything else
            expect(logger.emergency).not.toHaveBeenCalled();
            expect(logger.alert).not.toHaveBeenCalled();
            expect(logger.critical).not.toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
            expect(logger.warning).not.toHaveBeenCalled();
            expect(logger.notice).not.toHaveBeenCalled();
            expect(logger.debug).not.toHaveBeenCalled();
        });

        it('Creates an informational log after the ISR completes', () => {
            middleware(request, response, next);

            // Simulate completing the request
            response.writeHead(200/* Status Code */);

            // It should be getting information from the request and response
            expect(request.get).toHaveBeenCalled();
            expect(response.get).toHaveBeenCalled();

            // It should log an informational request
            expect(logger.informational).toHaveBeenCalledWith(jasmine.any(Object));

            // It should not log anything else
            expect(logger.emergency).not.toHaveBeenCalled();
            expect(logger.alert).not.toHaveBeenCalled();
            expect(logger.critical).not.toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
            expect(logger.warning).not.toHaveBeenCalled();
            expect(logger.notice).not.toHaveBeenCalled();
            expect(logger.debug).not.toHaveBeenCalled();
        });

    });
});
