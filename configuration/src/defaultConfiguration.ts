/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IConfiguration} from "./IConfiguration";
import {getVal} from "./getVal";

export class DefaultConfiguration implements IConfiguration {
    private defaultConfig: { [key: string]: any };

    /**
     * Construct the default configuration with passed default values object.
     *
     * @param {object} defaultValues - Object of key-value pairs where
     * the accompanying value is the default (fallback) for that key.
     */
    constructor(defaultValues: { [key: string]: any }) {
        this.defaultConfig = defaultValues || {};
    }

    /**
     * Get the value associated with the passed key from the default object.
     *
     * Return null if no value is set.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {string} Value of configuration variable named by key.
     */
    public getString(key: string | string[]): string {
        let val: any = getVal(key, this.defaultConfig);
        if (typeof val !== "string" && val !== null) {
            throw new Error(
                    `Configuration service found value for ${key} that was not a string.`);
        }
        return val;
    }

    /**
     * Get the value associated with the passed key from the default object.
     *
     * Return null if no value is set.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {T} Value of variable named by key.
     */
    public get<T>(key: string): T {
        let val: any = getVal(key, this.defaultConfig);
        return val as T;
    }
}
