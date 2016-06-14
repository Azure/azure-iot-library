# @azure-iot/configuration

This library provides support for managing configuration settings in Azure IoT microservices.

# Developer Setup

__1. Install Node__

Node can be found [here](https://nodejs.org).

__2. npm install__

This downloads and installs all dependencies required to support this library.

__3. npm run build__

This builds the project, putting the output into the base (`./dist`) folder.

# Usage
This library provides the main `Configuration` module, which exports the `config` singleton to create a dictionary-like interface of configuration values. Once initialized, `config` provides the `getString` and generic `get<T>` methods, described further below.

## Providers
Configuration keys are mapped to values from one of three _providers_, in order of preference:

- `file`: JSON file at `./user-config.json`
- `env`: environment variables
- `mongo`: Mongo DB at the address of the `mongoUri` configuration variable

## Configuration key casing
Configuration keys (_e.g._ `IOTHUB_CONNECTION_STRING`) should be set and used in all-caps.

## Initializing `config`
The `config` singleton takes several optional arguments in the asynchronous `initialize` call, including:

- `configFilename`: set to the location of the JSON file provider relative to the calling process's working directory. Defaults to `./user-config.json`.
- `requiredKeys`: set an array of variable names which must be assigned a value before returning from the initialization. Defaults to the empty array.

## Getter methods
The `config` singleton (and each provider) implements the `IConfiguration` interface, which has both a `get<T>` and `getString` method:

- `get<T>` returns `file` and `mongo` values as-is, and attempts to `JSON.parse` values from `env`, casting the return value `as T`
- `getString` returns all values as-is, and attempts to throw an error if the value is not a string

## Setting variables
Set configuration variables in the following ways:

- `file` provider: include the key-value pair in `./user-config.json`
- `env` provider: set an environment variable; for non-string values, set the stringified version of the object
- `mongo` provider: either set key-value pairs directly, or use `MongoConfiguration`'s `set` method.

## MongoDB options
A number of MongoDB options are available:

- Database: the DB to connect to should be included in the `mongoUri` configuration variable, _e.g._ `mongodb://localhost:27017/config_variables` connects to the `config_variables` DB on the localhost connection
- Collection: optional parameter to `config`'s `initialize` method; defaults to `config`
- Document: currently, the chosen collection must contain only a single document

# Example
This example creates the asynchronous `example` function, which initializes the `config` singleton and gets two values.

```typescript
import {config} from "@azure-iot/configuration";

async function example(): Promise<void> {
    // Asynchronously initialize the config service
    await config.initialize();

    // Get values from the config instance
    let loginUrl: string = config.getString("loginUrl");
    let sessionObject: any = config.get("sessionObject");
}
```

## Using providers directly
Each provider can also be used independently of `Configuration`. Specifically, the `MongoConfiguration` class can be used to set values through to a Mongo DB directly, as shown in the snippet below:

```typescript
import {MongoConfiguration} from "@azure-iot/configuration";

let mongoConfig = new MongoConfiguration();
await mongoConfig.initialize("mongodb://localhost:27017/test");
await mongoConfig.set("fruitKey", {"fruits": ["apple", "banana"]});
```
