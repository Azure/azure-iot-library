/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

/**
 * Test MongoConfiguration's getString and get<T> methods.
 *
 * Uses spies to stub/simulate relevant calls to the Mongo DB.
 * Specs test:
 *      - returned value is correct value and type
 *      - unset keys return undefined
 *      - throw error if getString tries to return non-string value
 *      - initialization waits correct number of seconds for DB connection
 */

import {MongoClient} from "mongodb";
import {MongoConfiguration} from "./mongoConfiguration";

describe("Mongo configuration provider", () => {
    let mongoConfig: MongoConfiguration;
    let mongoUri: string;
    let mongoDocument: { [key: string]: any };
    let keysNotInMongo: string[];
    let defaultCollectionName: string;
    let collectionStub;
    let findOneStub;
    let updateOneStub;

    // Prevent state leakage between specs; set spies
    beforeEach( done => async function() {
        // Silence console logging, also used in specs
        spyOn(console, "log");

        // Reset state
        mongoConfig = new MongoConfiguration();
        mongoUri = "mongoUriValue";
        mongoDocument = {
            KEY_1: "val_1",
            KEY_2: "val_2",
            FRUIT_OBJECT: { "fruit": ["apple", "banana"] },
            NESTED_OBJECT: {
                "apples": {
                    "gala": 41,
                    "jonagold": 42,
                    "honeycrisp": "43"
                }
            }
        };
        keysNotInMongo = ["NOT_PRESENT_1", "NOT_PRESENT_2"];
        defaultCollectionName = "config";


        // Spy stubs
        findOneStub = jasmine.createSpy("findOne")
            .and.callFake( (_, callback) => {
                callback(null, mongoDocument);
        });
        updateOneStub = jasmine.createSpy("updateOne")
            .and.callFake( (_, set, __) => {
                const update = set["$set"];
                const key = Object.keys(update)[0];
                const value = update[key];
                mongoDocument[key] = value;
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

        // Initialize mongoConfig instance
        await mongoConfig.initialize(mongoUri);
        // Expect the Mongo connection to be called with provided Mongo URI (and callback)
        expect(MongoClient.connect).toHaveBeenCalledWith(mongoUri, jasmine.any(Function));
        // Expect to connect to the correct collection
        expect(collectionStub).toHaveBeenCalledWith(defaultCollectionName);
        // Expect the single document to have been gotten (and callback)
        expect(findOneStub).toHaveBeenCalledWith({}, jasmine.any(Function));
    }().then(done, done.fail));

    it("gets correctly set values", () => {
        expect(mongoConfig.getString("KEY_1")).toEqual(mongoDocument["KEY_1"]);
        expect(mongoConfig.getString("KEY_2")).toEqual(mongoDocument["KEY_2"]);
        expect(mongoConfig.get<Object>("FRUIT_OBJECT"))
            .toEqual(mongoDocument["FRUIT_OBJECT"]);
        expect(mongoConfig.get(["NESTED_OBJECT", "apples", "gala"]))
            .toEqual(mongoDocument["NESTED_OBJECT"]["apples"]["gala"]);
    });

    it("returns undefined for unset keys", () => {
        expect(mongoConfig.getString(keysNotInMongo[0])).toBeUndefined();
        expect(mongoConfig.getString(keysNotInMongo[1])).toBeUndefined();
        expect(mongoConfig.get(keysNotInMongo[0])).toBeUndefined();
        expect(mongoConfig.get(keysNotInMongo[1])).toBeUndefined();
        expect(mongoConfig.get(["NESTED_OBJECT", "apples", "red delicious"])).toBeUndefined();
        expect(mongoConfig.get(["NESTED_OBJECT", "bananas"])).toBeUndefined();
        expect(mongoConfig.get(["NESTED_OBJECT", "cherries", "royal ann"])).toBeUndefined();
    });

    it("throws an error when using getString on a non-string type", () => {
        expect( () => mongoConfig.get("KEY_1") ).not.toThrow();
        expect( () => mongoConfig.get("KEY_2") ).not.toThrow();
        expect( () => mongoConfig.getString("FRUIT_OBJECT") ).toThrow();
        expect( () => mongoConfig.  getString(["NESTED_OBJECT", "apples", "gala"]))
            .toThrow();
        expect(() => mongoConfig.getString(["NESTED_OBJECT", "apples", "honeycrisp"]))
            .not.toThrow();
    });

    it("sets values correctly", done => async function() {
        const newVal1: string = "new-val-1";
        const newVal2: string[] = ["new", "val", "2"];
        // Check keys's initial values
        expect(mongoConfig.getString("KEY_1")).toEqual(mongoDocument["KEY_1"]);
        expect(mongoConfig.getString("NOT_PRESENT_1")).toBeUndefined();
        // Set new values
        await mongoConfig.set("KEY_1", newVal1);
        await mongoConfig.set("NOT_PRESENT_1", newVal2);
        // Check those new values
        expect(updateOneStub).toHaveBeenCalledTimes(2);
        expect(mongoConfig.getString("KEY_1")).toEqual(newVal1);
        expect(mongoConfig.get("NOT_PRESENT_1")).toEqual(newVal2);
    }().then(done, done.fail));  // execute async function then call done/done.fail

    it("waits for required keys", done => async function() {
        const requiredKeys: string[] = ["required-key-1", "required-key-2"];
        spyOn(mongoConfig, "get").and.returnValue(undefined);
        expect(mongoConfig.get).not.toHaveBeenCalled();
        try {
            await mongoConfig.initialize(mongoUri, requiredKeys, "config", 3);
            done.fail();  // expect initialization to fail
        } catch (err) {
            expect(mongoConfig.get).toHaveBeenCalled();
            done();
        }
    }());
});
