/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

// Syslog level protocol: https://tools.ietf.org/html/rfc5424
// 0       Emergency: system is unusable
// 1       Alert: action must be taken immediately
// 2       Critical: critical conditions
// 3       Error: error conditions
// 4       Warning: warning conditions
// 5       Notice: normal but significant condition
// 6       Informational: informational messages
// 7       Debug: debug - level messages          
  
export enum SyslogLevel {
    Emergency,
    Alert,
    Critical,
    Error,
    Warning,
    Notice,
    Informational,
    Debug
}