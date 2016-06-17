/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export function getVal(keyArg: string | string[], configObject: { [key: string]: any }): any {
    let val: any;
    // Flat return with single key
    if (typeof keyArg === "string") {
        val = configObject[keyArg];
    }
    // Nested return with array of keys
    else if (Array.isArray(keyArg)) {
        val = configObject;
        // Walk down through config object's nested keys
        for (let key of keyArg) {
            val = val[key];
            if (typeof val === "undefined") {
                return undefined;
            }
        }
    }
    return val;
}

export function getEnvVal(keyArg: string | string[], returnAsString: boolean): any {
    // Flat return with single key
    if (typeof keyArg === "string") {
        const val: string = process.env[keyArg];
        if (typeof val === "undefined") {
            return undefined;
        }
        return returnAsString ? val : JSON.parse(val);
    }
    // Nested return with array of keys
    else if (Array.isArray(keyArg)) {
        let val: any = process.env[keyArg[0]];
        if (typeof val === "undefined") {
            return undefined;
        }
        val = JSON.parse(val);
        // Walk down through fileConfig's nested keys
        for (let key of keyArg.slice(1)) {
            val = val[key];
            if (typeof val === "undefined") {
                return undefined;
            }
        }
        return val;
    }
}
