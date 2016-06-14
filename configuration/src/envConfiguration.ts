/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IConfiguration} from "./IConfiguration";

export class EnvConfiguration implements IConfiguration {
    /**
     * Get the value associated with the passed key from an environment
     * variable of the same name.
     *
     * @param {string} key - Name of variable to get.
     * @return {string} Value of configuration variable named by key.
     */
    public getString(key: string): string {
        return process.env[key];
    }

    /**
     * Get the value associated with the passed key from an environment
     * variable of the same name.
     *
     * Call JSON.parse on the variable before returning.
     *
     * @param {string} key - Name of variable to get.
     * @return {T} Value of variable named by key.
     */
    public get<T>(key: string): T {
        let val: string = this.getString(key);
        if (typeof val === "undefined") {
            return undefined;
        }
        return JSON.parse(val) as T;
    }
}
