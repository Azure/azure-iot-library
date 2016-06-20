/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {IConfiguration} from "./IConfiguration";
import {FileConfiguration} from "./fileConfiguration";
import {EnvConfiguration} from "./envConfiguration";
import {MongoConfiguration} from "./mongoConfiguration";
import {DefaultConfiguration} from "./defaultConfiguration";

const mongoUriKey: string = "MONGO_URI";
const mongoDbNameKey: string = "MONGO_CONFIG_DB";
const mongoCollectionNameKey: string = "MONGO_CONFIG_COLLECTION";
const defaultDbName: string = "config";
const defaultCollectionName: string = "config";
const requiredKeysErrMsg: string = "Not all required keys were found";
const noMongoUriMsg: string =
    "No Mongo URI found - using environment variables or user-config file instead";
const defaultConfigOptions: ConfigOptions = {
    defaultValues: {},
    requiredKeys: [],
    configFilename: "./user-config.json",
    secondsToRetry: 5 * 60
};

/*
 * Set of options for the config.initialize method.
 *
 * @param {object} defaultValues - Object of key-value pairs where
 * the accompanying value is the default (fallback) for that key.
 * @param {string[]} requiredKeys - Keys required to be present in
 * the MongoDB collection.
 * @param {string} configFilename - Location of the configuration JSON file
 * relative to the calling process's working directory.
 * @param {number} secondsToRetry - Time to wait for Mongo database to
 * come online and contain requiredKeys, throwing an error after the
 * allotted time.
 */
export interface ConfigOptions {
    defaultValues?: { [key: string]: any };
    requiredKeys?: string[];
    configFilename?: string;
    secondsToRetry?: number;
}

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
     *      - Set the MONGO_CONFIG_DB and MONGO_CONFIG_COLLECTION configuration
     *        variables (in the file, env, or default providers) to
     *        choose which DB and collection to use for the mongo
     *        provider.
     *      - The utilized Mongo collection (`config` by default) must
     *        contain only a single document.
     *
     * @param {ConfigOptions} params - Object of optional parameters. See
     * ConfigOptions for each parameter. Defaults to the empty object,
     * which will be filled in with default values.
     */
    public async initialize(params: ConfigOptions = {}): Promise<void> {
        params = this.addDefaultParams(params);
        let fileConfig = new FileConfiguration();
        let envConfig = new EnvConfiguration();
        let mongoConfig = new MongoConfiguration();
        let defaultConfig = new DefaultConfiguration(params.defaultValues);

        // Add initial providers
        await fileConfig.initialize(params.configFilename);
        // Check all providers, including defaultConfig, for mongo settings,
        // but then remove it from providers to preserve provider ordering
        this.providers = [fileConfig, envConfig, defaultConfig];
        const mongoUri: string = this.getString(mongoUriKey);
        const dbName: string = this.getString(mongoDbNameKey) || defaultDbName;
        const collectionName: string =
                this.getString(mongoCollectionNameKey) || defaultCollectionName;
        this.providers.pop();

        // Optionally add mongo provider
        let requiredKeys: string[] = this.updatedRequiredKeys(params.requiredKeys);
        if (typeof mongoUri === "undefined") {
            console.log(noMongoUriMsg);
            if (requiredKeys.length > 0) {
                throw new Error(`${requiredKeysErrMsg}: ${requiredKeys}`);
            }
        } else {
            await mongoConfig.initialize({
                mongoUri: mongoUri,
                dbName: dbName,
                collectionName: collectionName,
                requiredKeys: requiredKeys,
                secondsToRetry: params.secondsToRetry
            });
            this.providers.push(mongoConfig);
        }

        // Optionally add default provider
        if (typeof params.defaultValues !== "undefined") {
            this.providers.push(defaultConfig);
        }
    }

    private addDefaultParams(params: ConfigOptions): ConfigOptions {
        let fullParams: ConfigOptions = params;
        for (let key in defaultConfigOptions) {
            let val = (key in params) ? params[key] : defaultConfigOptions[key];
            fullParams[key] = val;
        }
        return fullParams;
    }

    private updatedRequiredKeys(requiredKeys: string[]): string[] {
        let newKeys: string[] = [];
        for (let key of requiredKeys) {
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
     * Configuration providers include, in order of preference:
     *      - JSON file of user preference key-value pairs stored
     *        by default in ./user-config.json
     *      - environment variables
     *      - a MongoDB document
     *      - the defaultValues object
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
     * Configuration providers include, in order of preference:
     *      - JSON file of user preference key-value pairs stored
     *        by default in ./user-config.json
     *      - environment variables
     *      - a MongoDB document
     *      - the defaultValues object
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
