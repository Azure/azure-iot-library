/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IConfiguration} from "./IConfiguration";
import {FileConfiguration} from "./fileConfiguration";
import {EnvConfiguration} from "./envConfiguration";
import {MongoConfiguration} from "./mongoConfiguration";

const defaultSecondsToRetry: number = 5 * 60;
const mongoUriKey: string = "MONGO_URI";
const requiredKeysErrMsg: string = "Not all required keys were found";
const noMongoUriMsg: string =
    "No Mongo URI found - using environment variables or user-config file instead";

export class Configuration implements IConfiguration {
    private providers: IConfiguration[] = [];

    /**
     * Asynchronously initialize configuration providers.
     *
     * Configuration providers include, in order of preference:
     *      - JSON file of user preference key-value pairs stored
     *        by default in ./user-config.json
     *      - Environment variables
     *      - A MongoDB document
     *
     * Notes:
     *      - The Mongo DB should be included in the `mongoUri` configuration
     *        variable.
     *      - The utilized Mongo collection (`config` by default) must
     *        contain only a single document.
     *      - The `mongoUri` key must be given a value before initialization.
     *
     * @param {string[]} requiredKeys - Keys required to be present in
     * the MongoDB collection.
     * @param {string} configFilename - Location of the configuration JSON file
     * relative to the calling process's working directory.
     * @param {string} collectionName - MongoDB collection to use for
     * key-value storage.
     * @param {number} secondsToRetry - Time to wait for Mongo database to
     * come online and contain requiredKeys, throwing an error after the
     * allotted time.
     */
    public async initialize(
            requiredKeys: string[] = [],
            configFilename: string = "user-config.json",
            collectionName: string = "config",
            secondsToRetry: number = defaultSecondsToRetry): Promise<void> {
        let fileConfig = new FileConfiguration();
        let envConfig = new EnvConfiguration();
        let mongoConfig = new MongoConfiguration();

        await fileConfig.initialize(configFilename);
        this.providers = [fileConfig, envConfig];

        let mongoUri: string = this.getString(mongoUriKey);
        requiredKeys = this.updatedRequiredKeys(requiredKeys);
        if (typeof mongoUri === "undefined") {
            console.log(noMongoUriMsg);
            if (requiredKeys.length > 0) {
                throw new Error(`${requiredKeysErrMsg}: ${requiredKeys}`);
            }
        } else {
            await mongoConfig.initialize(
                    mongoUri, requiredKeys, collectionName, secondsToRetry);
            this.providers.push(mongoConfig);
        }
    }

    private updatedRequiredKeys(requiredKeys: string[]): string[] {
        let newKeys: string[] = [];
        for (let key in requiredKeys) {
            if (typeof this.get(key) === "undefined") {
                newKeys.push(key);
            }
        }
        return newKeys;
    }

    /**
     * Get the value associated with the passed key from the ordered
     * configuration providers.
     *
     * @param {string} key - Name of variable to get.
     * @return {T} Value of variable named by key.
     */
    public get<T>(key: string): T {
        for (let provider of this.providers) {
            let val: T = provider.get<T>(key);
            if (typeof val !== "undefined") {
                return val;
            }
        }
        return undefined;
    }

    /**
     * Get the value associated with the passed key from the ordered
     * configuration providers.
     *
     * @param {string} key - Name of the configuration variable.
     * @return {string} Value of the configuration variable named by key.
     */
    public getString(key: string): string {
        for (let provider of this.providers) {
            let val: string = provider.getString(key);
            if (typeof val !== "undefined") {
                return val;
            }
        }
        return undefined;
    }
}

export const config = new Configuration();
