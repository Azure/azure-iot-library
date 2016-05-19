/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {ILogger} from './Ilogger';
import {SyslogLevel} from './sysloglevel';
import {bunyanLoader} from './bunyanLoader';

// Configuration for bunyan logger
export interface BunyanLoggerConfig {
    name: string;
    streams?: any[];
    level?: string | number;
    stream?: any;
    serializers?: any;
    src?: boolean;
}

export class BunyanLogger implements ILogger {
    private logger: any;
    constructor(loggerConfigs?: BunyanLoggerConfig) {
        let bunyan = bunyanLoader();

        if (!loggerConfigs) {
            // [Bunyan] - https://github.com/trentm/node-bunyan
            // By default, log output is to stdout and at the "info" level. Name is a required parameter.
            this.logger = bunyan.createLogger({ name: 'defaultLogger' });
        }
        else {
            this.logger = bunyan.createLogger(loggerConfigs);
        }
    }

    public setChild(options) {
        this.logger = this.logger.child(options);
    }

    // [Bunyan] Trace levels -  https://github.com/trentm/node-bunyan#log-record-fields
    // level : Required. Integer. Added by Bunyan. Cannot be overridden.
    // Use sysloglevel field for syslog protocol levels

    public emergency(log: any) {
        log.sysloglevel = SyslogLevel.Emergency;
        this.logger.fatal(log);
    }

    public alert(log: any) {
        log.sysloglevel = SyslogLevel.Alert;
        this.logger.fatal(log);
    }

    public critical(log: any) {
        log.sysloglevel = SyslogLevel.Critical;
        this.logger.fatal(log);
    }

    public error(log: any) {
        log.sysloglevel = SyslogLevel.Error;
        this.logger.error(log);
    }

    public warning(log: any) {
        log.sysloglevel = SyslogLevel.Warning;
        this.logger.warn(log);
    }

    public notice(log: any) {
        log.sysloglevel = SyslogLevel.Notice;
        this.logger.trace(log);
    }

    public informational(log: any) {
        log.sysloglevel = SyslogLevel.Informational;
        this.logger.info(log);
    }

    public debug(log: any) {
        log.sysloglevel = SyslogLevel.Debug;
        this.logger.debug(log);
    }
}
