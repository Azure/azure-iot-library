/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import {DefaultConfiguration} from "./defaultConfiguration";

/**
 * Test DefaultConfiguration's getString and get<T> methods.
 *
 * Before each spec set the defaultironment variables appropriately.
 * Specs test:
 *      - returned value is correct value and type
 *      - unset key returns undefined
 *      - errors thrown for incorrect usage of getString vs get<T>
 */
describe("Defaultironment configuration provider", () => {
    let defaultConfig: DefaultConfiguration;
    let defaultKeys: { [key: string]: any };
    let fruitsObject: { [key: string]: string[] };
    let keysNotInDefault: string[];

    // Reset defaultironment variables
    beforeEach( () => {
        // Defaultironment variables and expected outputs
        defaultKeys = {
            DEFAULT_KEY_1: "default-val-1",
            DEFAULT_KEY_2: "default-val-2",
            DEFAULT_FRUIT_OBJECT: { "fruit": ["apple", "banana"] }
        };
        keysNotInDefault = ["NOT_PRESENT_1", "NOT_PRESENT_2"];

        defaultConfig = new DefaultConfiguration(defaultKeys);
    });

    it("gets correctly set values", () => {
        expect(defaultConfig.getString("DEFAULT_KEY_1")).toEqual(defaultKeys["DEFAULT_KEY_1"]);
        expect(defaultConfig.getString("DEFAULT_KEY_2")).toEqual(defaultKeys["DEFAULT_KEY_2"]);
        expect(defaultConfig.get("DEFAULT_FRUIT_OBJECT"))
            .toEqual(defaultKeys["DEFAULT_FRUIT_OBJECT"]);
    });

    it("returns undefined for unset keys", () => {
        expect(defaultConfig.getString(keysNotInDefault[0])).toBeUndefined();
        expect(defaultConfig.get(keysNotInDefault[1])).toBeUndefined();
    });

    it("throws an error when using get<T> for a string", () => {
        expect( () => defaultConfig.get("DEFAULT_KEY_1") ).not.toThrow();
        expect( () => defaultConfig.get("DEFAULT_KEY_2") ).not.toThrow();
        expect( () => defaultConfig.get("DEFAULT_FRUIT_OBJECT") ).not.toThrow();
        expect( () => defaultConfig.getString("DEFAULT_FRUIT_OBJECT") ).toThrow();
    });
});
