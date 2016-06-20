/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export function getVal(keyArg: string | string[], configObject: { [key: string]: any }): any {
    // Return early if config object can't be indexed into
    if (configObject == null) {
        return undefined;
    }
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
        let val: string = process.env[keyArg];
        if (typeof val === "undefined") {
            return undefined;
        }
        // Try to call JSON.parse, fall back to returning as-is
        if (returnAsString === false) {
            try {
                val = JSON.parse(val);
            } catch (err) {
                // pass
            }
        }
        return val;
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
