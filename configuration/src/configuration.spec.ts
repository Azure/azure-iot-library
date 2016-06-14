/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/**
 * Test Configuration's getString and get<T> methods.
 *
 * Specs test:
 *      - returned value is correct value and type
 *      - unset keys return undefined
 *      - providers are consulted in the correct order
 *        (file, env, then mongo)
 */

import {MongoClient} from "mongodb";
import {config} from "./configuration";
import {FileConfiguration} from "./fileConfiguration";
import {EnvConfiguration} from "./envConfiguration";
import {MongoConfiguration} from "./mongoConfiguration";

describe("Configuration provider", () => {
    let fileConfig: FileConfiguration;
    let envConfig: EnvConfiguration;
    let mongoConfig: MongoConfiguration;

    let configFilename: string;

    let fileKeys: { [key: string]: any };
    let envKeys: { [key: string]: any };
    let mongoKeys: { [key: string]: any };
    let keysNotPresent: string[];

    let collectionStub;
    let findOneStub;
    let updateOneStub;

    beforeEach( done => async function() {
        // Silence console.log with spy
        spyOn(console, "log");
        // Prevent state leakage between specs
        fileConfig = new FileConfiguration();
        envConfig = new EnvConfiguration();
        mongoConfig = new MongoConfiguration();
        configFilename = `${__dirname}/../test/user-config-test.json`;
        fileKeys = {
            FILE_KEY_1: "file-val-1",
            SHARED_KEY_1: "shared-val-1",
            FILE_FRUIT_OBJECT: { "fruit": ["apple", "banana"] }
        };
        envKeys = {
            ENV_KEY_1: "env-val-1",
            SHARED_KEY_1: "shared-val-1",
            SHARED_KEY_2: "shared-val-2"
        };
        mongoKeys = {
            MONGO_KEY_1: "file-val-1",
            SHARED_KEY_1: "shared-val-1",
            SHARED_KEY_2: "shared-val-2",
            MONGO_FRUIT_OBJECT: { "fruit": ["cherry", "date"] }
        };
        keysNotPresent = ["NOT_PRESENT_1", "NOT_PRESENT_2"];
        for (let key in envKeys) {
            process.env[key] = envKeys[key];
        }

        // Stub mongoConfig calls
        findOneStub = jasmine.createSpy("findOne")
            .and.callFake( (_, callback) => {
                callback(null, mongoKeys);
        });
        updateOneStub = jasmine.createSpy("updateOne")
            .and.callFake( (_, set, __) => {
                const update = set["$set"];
                const key = Object.keys(update)[0];
                const value = update[key];
                mongoKeys[key] = value;
            });
        collectionStub = jasmine.createSpy("collection")
            .and.callFake( _ => {
                // Return the stubbed colleciton object
                return {
                    "findOne": findOneStub,
                    "updateOne": updateOneStub
                };
            });
        // Spy on MongoClient's connect method by allowing the ability
        // to get a stubbed collection object from db.collection(collectionName)
        spyOn(MongoClient, "connect").and.callFake( (_, callback) => {
            const databaseStub = { collection: collectionStub };
            callback(null, databaseStub);
        });

        await config.initialize([], configFilename);
    }().then(done, done.fail));

    it("should return correctly set values", () => {
        expect(config.get("FILE_FRUIT_OBJECT")).toEqual(fileKeys["FILE_FRUIT_OBJECT"]);
        expect(config.getString("FILE_KEY_1")).toEqual(fileKeys["FILE_KEY_1"]);
        expect(config.getString("ENV_KEY_1")).toEqual(process.env["ENV_KEY_1"]);
        expect(config.getString("MONGO_KEY_1")).toEqual(mongoKeys["MONGO_KEY_1"]);
    });

    it("should return undefined for unset values", () => {
        expect(config.get(keysNotPresent[0])).toBeUndefined();
        expect(config.get(keysNotPresent[1])).toBeUndefined();
        expect(config.getString(keysNotPresent[0])).toBeUndefined();
        expect(config.getString(keysNotPresent[1])).toBeUndefined();
    });

    it("should enforce preference in provider order", () => {
        // File takes preference over env and mongo
        expect(config.getString("SHARED_KEY_1")).toEqual(fileKeys["SHARED_KEY_1"]);
        // Env takes preference over mongo
        expect(config.getString("SHARED_KEY_2")).toEqual(envKeys["SHARED_KEY_2"]);
    });
});
