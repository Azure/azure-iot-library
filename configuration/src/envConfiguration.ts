/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IConfiguration} from './IConfiguration';
import {getEnvVal} from './getVal';

export class EnvConfiguration implements IConfiguration {
    /**
     * Get the value associated with the passed key from an environment
     * variable of the same name.
     *
     * Returns null if no value is set.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {string} Value of configuration variable named by key.
     */
    public getString(key: string | string[]): string {
        let val: any = getEnvVal(key, true);
        if (typeof val !== 'string' && val !== null) {
            throw new Error(
                    `Configuration service found value for ${key} that was not a string.`);
        }
        return val;
    }

    /**
     * Get the value associated with the passed key from an environment
     * variable of the same name.
     *
     * Returns null if no value is set.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {T} Value of variable named by key.
     */
    public get<T>(key: string | string[]): T {
        let val: any = getEnvVal(key, false);
        return val as T;
    }
}
