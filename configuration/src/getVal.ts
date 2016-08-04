/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

export function getVal(keyArg: string | string[], configObject: { [key: string]: any }): any {
    // Return early if config object can't be indexed into
    if (configObject == null) {
        return null;
    }
    let val: any;
    // Flat return with single key
    if (typeof keyArg === "string") {
        val = configObject[keyArg];
        return val || null;
    }
    // Nested return with array of keys
    else if (Array.isArray(keyArg)) {
        val = configObject;
        // Walk down through config object's nested keys
        for (let key of keyArg) {
            val = val[key];
            // If value is null or undefined, return null
            if (val == null) {
                return null;
            }
        }
        return val || null;
    }
}

export function getEnvVal(keyArg: string | string[], returnAsString: boolean): any {
    // Flat return with single key
    if (typeof keyArg === "string") {
        let val: string = process.env[keyArg];
        // If value is null or undefined, return null
        if (val == null) {
            return null;
        }
        // Try to call JSON.parse, fall back to returning as-is
        if (returnAsString === false) {
            try {
                val = JSON.parse(val);
            } catch (err) {
                // pass
            }
        }
        return val || null;
    }
    // Nested return with array of keys
    else if (Array.isArray(keyArg)) {
        let val: any = process.env[keyArg[0]];
        // If value is null or undefined, return null
        if (val == null) {
            return null;
        }
        val = JSON.parse(val);
        // Walk down through fileConfig's nested keys
        for (let key of keyArg.slice(1)) {
            val = val[key];
            // If value is null or undefined, return null
            if (val == null) {
                return null;
            }
        }
        return val || null;
    }
}
