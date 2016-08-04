/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export interface IConfiguration {
    getString(key: string | string[]): string;
    get<T>(key: string | string[]): T;
}
