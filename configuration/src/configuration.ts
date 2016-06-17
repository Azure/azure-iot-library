/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IConfiguration} from "./IConfiguration";
import {FileConfiguration} from "./fileConfiguration";
import {EnvConfiguration} from "./envConfiguration";
import {MongoConfiguration} from "./mongoConfiguration";
import {DefaultConfiguration} from "./defaultConfiguration";

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
     *      - environment variables
     *      - a MongoDB document
     *      - the defaultValues object
     *
     * Notes:
     *      - The Mongo DB should be included in the MONGO_URI configuration
     *        variable.
     *      - The utilized Mongo collection (`config` by default) must
     *        contain only a single document.
     *      - The MONGO_URI key must be given a value _before_ initialization.
     *
     * @param {object} defaultValues - Object of key-value pairs where
     * the accompanying value is the default (fallback) for that key.
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
            defaultValues: { [key: string]: any } = {},
            requiredKeys: string[] = [],
            configFilename: string = "user-config.json",
            collectionName: string = "config",
            secondsToRetry: number = defaultSecondsToRetry
            ): Promise<void> {
        let fileConfig = new FileConfiguration();
        let envConfig = new EnvConfiguration();
        let mongoConfig = new MongoConfiguration();
        let defaultConfig = new DefaultConfiguration(defaultValues);

        // Add initial providers
        await fileConfig.initialize(configFilename);
        // Check defaultConfig for mongoUri, but then remove it from providers
        // to preserve provider ordering
        this.providers = [fileConfig, envConfig, defaultConfig];
        let mongoUri: string = this.getString(mongoUriKey);
        this.providers.pop();

        // Optionally add mongo provider
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

        // Optionally add default provider
        if (typeof defaultValues !== "undefined") {
            this.providers.push(defaultConfig);
        }
    }

    private updatedRequiredKeys(requiredKeys: string[]): string[] {
        let newKeys: string[] = [];
        for (let key of requiredKeys) {
            let val: any;
            // Try both get<T> and getString to see if the provider has any
            // val for key
            try {
                val = this.get(key);
            } catch (err) {
                val = this.getString(key);
            }
            if (typeof val === "undefined") {
                newKeys.push(key);
            }
        }
        return newKeys;
    }

    /**
     * Get the value associated with the passed key from the ordered
     * configuration providers.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {T} Value of variable named by key.
     */
    public get<T>(key: string | string[]): T {
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
     * @param {string | string[]} key - Name of the variable to get.
     * @return {string} Value of the configuration variable named by key.
     */
    public getString(key: string | string[]): string {
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
