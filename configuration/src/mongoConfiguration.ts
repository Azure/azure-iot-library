/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {MongoClient, Db, Collection} from "mongodb";
import {IConfiguration} from "./IConfiguration";
import {getVal} from "./getVal";

const defaultSecondsToRetry: number = 5 * 60;
const timeoutSeconds: number = 8;
const connectionSuccessMsg: string = "Connected to config database";
const requiredKeysErrMsg: string =
    "Configuration service cannot find the required keys";

export class MongoConfiguration implements IConfiguration {
    private mongoConfig: { [key: string]: any } = {};
    private mongoUri: string;
    private db: Db;
    private collection: Collection;

    /**
     * Asynchronously initialize configuration values from the passed
     * Mongo database.
     *
     * Retries the DB connection up to secondsToRetry seconds. Returns early if
     * connection is successful and requiredKeys are found in the
     * collectionName collection.
     *
     * @param {string} mongoUri - URI of the desired Mongo DB.
     * @param {string[]} requiredKeys - Array of keys required to be contained
     * in the collectionName collection before completing initialization.
     * @param {string} collectionName - Specific collection used to store/get
     * values.
     * @param {number} secondsToRetry - Max number of seconds to wait for
     * a connection and all requiredKeys before throwing an error.
     */
    public async initialize(
            mongoUri: string,
            requiredKeys: string[] = [],
            collectionName: string = "config",
            secondsToRetry: number = defaultSecondsToRetry
            ): Promise<void> {
        this.mongoUri = mongoUri;
        await this.initializeDb(collectionName, requiredKeys, secondsToRetry);
        console.log(connectionSuccessMsg);
    }

    private async initializeDb(
            collectionName: string,
            requiredKeys: string[],
            secondsToRetry: number
            ): Promise<void> {
        while (true) {
            try {
                // Establish a connection
                this.db = await new Promise<Db>( (resolve, reject) => {
                    MongoClient.connect(this.mongoUri, (err, database) => {
                        err ? reject(err) : resolve(database);
                    });
                });
                // Set this.mongoConfig
                this.collection = this.db.collection(collectionName);
                this.mongoConfig = await new Promise( (resolve, reject) => {
                    this.collection.findOne({}, (err, doc) => {
                        err ? reject(err) : resolve(doc);
                    });
                });
                // Ensure this.mongoConfig contains the requiredKeys
                this.requireKeys(requiredKeys);
                return;
            } catch (err) {
                // Wait before retrying connection
                secondsToRetry -= timeoutSeconds;
                if (secondsToRetry <= 0) {
                    throw err;
                }
                await new Promise( (resolve, reject) => {
                    setTimeout(resolve, timeoutSeconds * 1000);
                });
            }
        }
    }

    private requireKeys(requiredKeys: string[]) {
        let val: any;
        for (let key of requiredKeys) {
            // Try both get<T> and getString to see if the provider has any
            // val for key
            try {
                val = this.get(key);
            } catch (err) {
                val = this.getString(key);
            }
            if (typeof val === "undefined") {
                throw new Error(requiredKeysErrMsg);
            }
        }
    }

    /**
     * Get the value associated with the passed key.
     *
     * Throw an error if the keyed value type is not a string.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {string} Value of variable named by key.
     */
    public getString(key: string | string[]): string {
        let val: any = getVal(key, this.mongoConfig);
        if (typeof val !== "string" && typeof val !== "undefined") {
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
    public get<T>(key: string | string[]): T {
        let val: any = getVal(key, this.mongoConfig);
        return val as T;
    }

    /**
     * Deep key-value write through to the underlying collection.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {any} Value of variable named by key.
     */
    public async set(key: string, value: any): Promise<void> {
        let query = {};
        let update = {};
        query[key] = {$exists: true};
        update[key] = value;

        await this.collection.updateOne({}, {$set: update}, {upsert: true});
        this.mongoConfig[key] = value;
    }
}
