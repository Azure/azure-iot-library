/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {EnvConfiguration} from "./envConfiguration";

/**
 * Test EnvConfiguration's getString and get<T> methods.
 *
 * Before each spec set the environment variables appropriately.
 * Specs test:
 *      - returned value is correct value and type
 *      - unset key returns undefined
 *      - errors thrown for incorrect usage of getString vs get<T>
 */
describe("Environment configuration provider", () => {
    let envConfig: EnvConfiguration;
    let envKeys: { [key: string]: string };
    let fruitsObject: { [key: string]: string[] };
    let keysNotInEnv: string[];

    // Reset environment variables
    beforeEach( () => {
        envConfig = new EnvConfiguration();
        // Environment variables and expected outputs
        envKeys = {
            CONN_STR: "iot-hub-conn-str-val",
            MONGO_URI: "mongodb://localhost:27017/test",
            STRINGIFIED_FRUITS: `{"fruits":["apple","banana"]}`
        };
        fruitsObject = {
            fruits: ["apple", "banana"]
        };
        keysNotInEnv = ["NOT_PRESENT_1", "NOT_PRESENT_2"];

        // Add desired keys in
        for (let key in envKeys) {
            process.env[key] = envKeys[key];
        }
        // Remove undesired keys
        for (let key in keysNotInEnv) {
            delete process.env[key];
        }

    });

    it("gets correctly set values", () => {
        expect(envConfig.getString("CONN_STR")).toEqual(envKeys["CONN_STR"]);
        expect(envConfig.getString("MONGO_URI")).toEqual(envKeys["MONGO_URI"]);
        expect(envConfig.get<{ [key: string]: string[] }>("STRINGIFIED_FRUITS"))
            .toEqual(fruitsObject);
    });

    it("returns undefined for unset keys", () => {
        expect(envConfig.getString(keysNotInEnv[0])).toBeUndefined();
        expect(envConfig.get(keysNotInEnv[1])).toBeUndefined();
    });

    it("throws an error when using get<T> for a string", () => {
        expect( () => envConfig.get("CONN_STR") ).toThrow();
        expect( () => envConfig.get("MONGO_URI") ).toThrow();
        expect( () => envConfig.get("STRINGIFIED_FRUITS") ).not.toThrow();
    });
});
