/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {MongoClient, Db, Collection} from 'mongodb';
import {IConfiguration} from './IConfiguration';
import {getVal} from './getVal';

const timeoutSeconds: number = 8;
const connectionSuccessMsg: string = 'Connected to configuration database';
const requiredKeysErrMsg: string =
    'Configuration service cannot find the required keys';
const defaultMongoOptions: MongoOptions = {
    mongoUri: '',  // this is a required value, default will never be used
    dbName: 'config',
    collectionName: 'config',
    requiredKeys: [],
    secondsToRetry: 5 * 60,
    logger: console.log
};

/*
 * Set of options for MongoConfiguration's initialize method.
 *
 * @param {string} mongoUri - URI of the desired Mongo DB.
 * @params{string} dbName - Specific DB used to store/get values.
 * @param {string} collectionName - Specific collection used to store/get
 * values.
 * @param {number} secondsToRetry - Max number of seconds to wait for
 * @param {string[]} requiredKeys - Array of keys required to be contained
 * in the collectionName collection before completing initialization.
 * a connection and all requiredKeys before throwing an error.
 * @param {function} logger - Optional logger function to call in place of
 * console.log.
 */
export interface MongoOptions {
    mongoUri: string;
    dbName?: string;
    collectionName?: string;
    requiredKeys?: string[];
    secondsToRetry?: number;
    logger?: Function;
}

export class MongoConfiguration implements IConfiguration {
    private mongoConfig: { [key: string]: any } = {};
    private params: MongoOptions;

    /**
     * Asynchronously initialize configuration values from the passed
     * Mongo database.
     *
     * Retries the DB connection up to secondsToRetry seconds. Returns early if
     * connection is successful and requiredKeys are found in the
     * collectionName collection.
     *
     * @param {MongoOptions} params - Object of optional parameters. See
     * MongoOptions for each parameter. Requires the mongoUri key, and
     * fills in with default values for other keys.
     */
    public async initialize(params: MongoOptions): Promise<void> {
        this.params = this.addDefaultParams(params);
        await this.initializeDb();
        this.params.logger(connectionSuccessMsg);
    }

    private addDefaultParams(params: MongoOptions): MongoOptions {
        let fullParams: MongoOptions = params;
        for (let key in defaultMongoOptions) {
            let val = (key in params) ? params[key] : defaultMongoOptions[key];
            fullParams[key] = val;
        }
        return fullParams;
    }

    private async initializeDb(): Promise<void> {
        while (true) {
            let db: Db;
            try {
                // Establish a connection
                db = await new Promise<Db>( (resolve, reject) => {
                    const mongoUri: string = `${this.params.mongoUri}/${this.params.dbName}`;
                    MongoClient.connect(mongoUri, (err, database) => {
                        err ? reject(err) : resolve(database);
                    });
                });
                // Set this.mongoConfig
                const collection: Collection = db.collection(this.params.collectionName);
                this.mongoConfig = await new Promise( (resolve, reject) => {
                    collection.findOne({}, (err, doc) => {
                        doc = doc || {};
                        err ? reject(err) : resolve(doc);
                    });
                });
                // Ensure this.mongoConfig contains the requiredKeys, then
                // close the connection
                this.requireKeys(this.params.requiredKeys);
                db.close();
                return;
            } catch (err) {
                // Wait before retrying connection
                this.params.secondsToRetry -= timeoutSeconds;
                this.params.secondsToRetry = Math.max(this.params.secondsToRetry, 0);
                this.params.logger(`Waiting for mongo provider - ${this.params.secondsToRetry} seconds left`);
                if (this.params.secondsToRetry <= 0) {
                    db.close();
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
            val = this.get(key);
            if (val === null) {
                throw new Error(requiredKeysErrMsg);
            }
        }
    }

    /**
     * Get the value associated with the passed key.
     *
     * Return null if no value is set. Throw an error if the
     * keyed value type is not a string.
     *
     * @param {string | string[]} key - Name of the variable to get.
     * @return {string} Value of variable named by key.
     */
    public getString(key: string | string[]): string {
        let val: any = getVal(key, this.mongoConfig);
        if (typeof val !== 'string' && val !== null) {
            throw new Error(
                    `Configuration service found value for ${key} that was not a string.`);
        }
        return val;
    }

    /**
     * Get the value associated with the passed key.
     *
     * Return null if no value is set.
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
        // Set update objects
        let query = {};
        let update = {};
        query[key] = {$exists: true};
        update[key] = value;

        // Establish a connection
        const db: Db = await new Promise<Db>( (resolve, reject) => {
            const mongoUri: string = `${this.params.mongoUri}/${this.params.dbName}`;
            MongoClient.connect(mongoUri, (err, database) => {
                err ? reject(err) : resolve(database);
            });
        });
        this.params.logger(connectionSuccessMsg);
        // Update key-value pair
        const collection: Collection = db.collection(this.params.collectionName);
        await collection.updateOne({}, {$set: update}, {upsert: true});
        this.mongoConfig[key] = value;
        db.close();
    }
}
