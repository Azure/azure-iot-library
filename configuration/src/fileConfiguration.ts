/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {readFile, access, F_OK} from "fs";
import {IConfiguration} from "./IConfiguration";

const fileConsumedMsg: string = "User config file found";
const fileReadingErrMsg: string =
    "User config file found but unable to be read";
const fileNotFoundMsg: string =
    "No user config file found - using environment variables or " +
    "configuration service instead";

export class FileConfiguration implements IConfiguration {
    private fileConfig: { [key: string]: any } = {};

    /**
     * Asynchronously initialize configuration values from the passed file.
     *
     * @param {string} configFilename - Name of the JSON file containing
     * configuration preferences.
     */
    public async initialize(configFilename: string): Promise<void> {
        try {
            await this.checkFileExistence(configFilename);
        } catch (err) {
            console.log(fileNotFoundMsg);
            return;
        }

        let fileConfigPromise = new Promise<string>( (resolve, reject) => {
            readFile(configFilename, "utf8", (err, result) => {
                if (err) {
                    reject(err);
                }
                console.log(fileConsumedMsg);
                resolve(result);
            });
        }).catch( (errMsg) => {
            throw new Error(fileReadingErrMsg);
        });

        let fileConfig: string = await fileConfigPromise;
        this.fileConfig = JSON.parse(fileConfig);
    }

    private async checkFileExistence(configFilename: string): Promise<void> {
        let fileExistence = new Promise<void>( (resolve, reject) => {
            access(configFilename, F_OK, (err) => {
                err ? reject(err) : resolve();
            });
        });

        await fileExistence;
    }

    /**
     * Get the value associated with the passed key.
     *
     * Throw an error if the keyed value type is not a string.
     *
     * @param {string} key - Name of variable to get.
     * @return {string} Value of variable named by key.
     */
    public getString(key: string): string {
        let val: string = this.fileConfig[key];
        if (typeof val === "undefined") {
            return val;
        }
        if (typeof val !== "string") {
            throw new Error(
                    `Configuration service found value for ${key} that was not a string.`);
        }
        return val;
    }

    /**
     * Get the value associated with the passed key.
     *
     * @param {string} key - Name of variable to get.
     * @return {T} Value of variable named by key.
     */
    public get<T>(key: string): T {
        return this.fileConfig[key] as T;
    }
}
