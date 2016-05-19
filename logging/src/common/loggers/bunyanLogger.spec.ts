/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {RawStream} from './rawStream.test';
import {BunyanLogger, Common, Trace, PageAction, PageView, IncomingServiceRequest, OutgoingServiceRequest, Exception} from '../common';

function validateLevel(log, level, sysloglevel) {
    expect(log.sysloglevel).toBe(sysloglevel);
    expect(log.level).toBe(level);
}

describe('Bunyan browser logger tests - Test levels', () => {

    let logger: BunyanLogger;

    let myStream = new RawStream();
    beforeEach(() => {
        logger = new BunyanLogger(
            {
                name: 'app',
                streams: [
                    {
                        level: 'trace',
                        type: 'raw',    // use 'raw' custom stream to log records wherever you want
                        stream: myStream
                    }
                ]
            });
    });

    afterEach(() => {
        myStream.clear();
    });

    it('should log Emergency', () => {
        let msg = { message: 'Emergency' };
        logger.emergency(msg);

        validateLevel(myStream.get(), 60, 0);
    });

    it('should log Alert', () => {
        let msg = { message: 'Alert' };
        logger.alert(msg);

        validateLevel(myStream.get(), 60, 1);
    });

    it('should log Critical', () => {
        let msg = { message: 'Critical' };
        logger.critical(msg);

        validateLevel(myStream.get(), 60, 2);
    });

    it('should log Error', () => {
        let msg = { message: 'Error' };
        logger.error(msg);

        validateLevel(myStream.get(), 50, 3);
    });

    it('should log Warning', () => {
        let msg = { message: 'Warning' };
        logger.warning(msg);

        validateLevel(myStream.get(), 40, 4);
    });

    it('should log Notice', () => {
        let msg = { message: 'Notice' };
        logger.notice(msg);

        validateLevel(myStream.get(), 10, 5);
    });

    it('should log Informational', () => {
        let msg = { message: 'Informational' };
        logger.informational(msg);

        validateLevel(myStream.get(), 30, 6);
    });

    it('should log Debug', () => {
        let msg = { message: 'Debug' };
        logger.debug(msg);

        validateLevel(myStream.get(), 20, 7);
    });
});

describe('Bunyan browser logger tests - Test events', () => {

    let logger: BunyanLogger;

    let myStream = new RawStream();
    beforeEach(() => {
        logger = new BunyanLogger(
            {
                name: 'app',
                streams: [
                    {
                        level: 'trace',
                        type: 'raw',    // use 'raw' custom stream to log records wherever you want
                        stream: myStream
                    }
                ]
            });
    });

    afterEach(() => {
        myStream.clear();
    });

    it('should log Trace', () => {
        let trace = new Trace('hello');
        let common = new Common('1.0', 'testApp', Date.now().toString(), 'Windows', '10', 'appId', '0.0', 'cV');
        logger.informational({ trace: trace, common: common });

        let log = myStream.get();
        expect(log['trace']['eventType']).toBe('Trace');
        expect(log['trace']['message']).toBe('hello');
        expect(log['common']).not.toBeNull();
    });

    it('should log PageAction', () => {
        let pageAction = new PageAction('actionName', 'localhost', 'http://localhost:3030/unit-test.html');
        let common = new Common('1.0', 'testApp', Date.now().toString(), 'Windows', '10', 'appId', '0.0', 'cV');
        logger.informational({ pageAction: pageAction, common: common });

        let log = myStream.get();
        expect(log['pageAction']['pageName']).toBe('localhost');
        expect(log['pageAction']['uri']).toBe('http://localhost:3030/unit-test.html');
    });

    it('should log PageView', () => {
        let pageView = new PageView('localhost', 'http://localhost:3030/unit-test.html');
        let common = new Common('1.0', 'testApp', Date.now().toString(), 'Windows', '10', 'appId', '0.0', 'cV');
        logger.informational({ pageView: pageView, common: common });

        let log = myStream.get();
        expect(log['pageView']['pageName']).toBe('localhost');
        expect(log['pageView']['uri']).toBe('http://localhost:3030/unit-test.html');
    });

    it('should log Exception', () => {
        let exception = new Exception('name', 'details', 1, 'type', 1, 12, false, 'location', 'method', 'username');
        logger.informational({ exception: exception });

        let log = myStream.get();
        expect(log['exception']['errorName']).toBe('name');
        expect(log['exception']['errorDetails']).toBe('details');
        expect(log['exception']['severity']).toBe(1);
    });

    it('should log ISR', () => {
        let isr = new IncomingServiceRequest('operationName', 'requestMethod', 500, 10, [], 'hostname');
        let common = new Common('1.0', 'testApp', Date.now().toString(), 'Windows', '10', 'appId', '0.0', 'cV');
        logger.informational({ isr: isr, common: common });

        let log = myStream.get();
        expect(log['isr']['operationName']).toBe('operationName');
        expect(log['isr']['requestMethod']).toBe('requestMethod');
        expect(log['isr']['responseStatusCode']).toBe(500);
    });

    it('should log OSR', () => {
        let osr = new OutgoingServiceRequest('operationName', 10, 'hostname', false);
        let common = new Common('1.0', 'testApp', Date.now().toString(), 'Windows', '10', 'appId', '0.0', 'cV');
        logger.informational({ osr: osr, common: common });

        let log = myStream.get();
        expect(log['osr']['operationName']).toBe('operationName');
        expect(log['osr']['latencyMs']).toBe(10);
    });
});
