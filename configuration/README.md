# @azure-iot/configuration

This library provides support for managing configuration settings in Azure IoT microservices.

# Developer Setup

__1. Install Node__

Node can be found [here](https://nodejs.org).

__2. npm install__

This downloads and installs all dependencies required to support this library.

__3. npm run build__

This builds the project, putting the output into the base (`./dist`) folder.

# Description
This library provides the main `Configuration` module, which exports the `config` singleton to create a dictionary-like interface of configuration values. Once initialized, `config` provides the `getString` and generic `get<T>` methods, described further below.

## Providers
Configuration keys are mapped to values from one of four _providers_, in order of preference:

1. `file`: JSON file at `./user-config.json`
2. `env`: environment variables
3. `mongo`: Mongo DB at the address of the `MONGO_URI` configuration variable
4. `default`: default values passed as an optional argument to `config.initialize`

For example, if both the `file` and `default` providers contained a value for the same key, the `file` provider would be authoritative.

## Setting variables
Configuration variables only need to be set for one configuration provider. Variables can be set for each of the providers in the following ways:

- `file` provider: include the key-value pair in `./user-config.json`
- `env` provider: set an environment variable; for non-string values, set the stringified version of the object
- `mongo` provider: either set key-value pairs directly, or use `MongoConfiguration.set`
- `default` provider: include the key-value pair in the optional `defaultValues` parameter for `config.initialize`

See the __Example__ section for more.


## Getting variables
The `config` singleton (and each provider) implements the `IConfiguration` interface, which has both a `get<T>` and `getString` method:

- `get<T>(key)`: use when you expect the returned value to be anything other than a string; _e.g._ an object, array, etc.
- `getString(key)`: use when you expect the returned value to be a string

The `key` parameter can be either a string or an array of strings. If `key` is a string, `get` and `getString` return the associated value. If `key` is an array, however, `get` and `getString` will walk down through a nested object to return the associated value. For example:

```typescript
// Let's say config.get("KEY") -> { "fruits": ["apples", "bananas"] }

let outerValue = config.get("KEY");
let innerValue = config.get(["KEY", "fruits"]);
let missingValue = config.get(["KEY", "vegetables"]);

// This leaves us with:
// outerValue = { "fruits": ["apples", "bananas"] }
// innerValue = ["apples", "bananas"]
// missingValue = undefined
```

## Initializing `config`
The `config` singleton takes several optional arguments in the asynchronous `initialize` call, including:

- `defaultValues`: an object of key-value pairs which serve as default values---_i.e._ `defaultValues` is consulted if all other providers return `undefined`; defaults to an empty array
- `requiredKeys`: an array of variable names which must be assigned a value before returning from the initialization; defaults to an empty array
- `configFilename`: the location of the JSON file provider relative to the calling process's working directory; defaults to `./user-config.json`

__Note:__ `requiredKeys` and `defaultValues` should not share any keys. Sharing keys between these arguments results in unspecified behavior.

# Examples
## Provisioning a provider
This example creates a `file` provider sourced from `./user-config.json` and a `mongo` provider sourced from the Mongo DB at the location of `MONGO_URI`.

Let's say we have the following as our `./user-config.json` file:
```JSON
{
    "SERVICES": {
            "service_1": {
                "name": "foo",
                "href": "bar.com",
            }
    },
    "MONGO_URI": "mongodb://localhost:27017/example_database"
}
```
This means, _e.g._, `config.getString(["services", "service_1", "name"]) -> "foo"`.

Now, to provision a `mongo` provider with `service_2`, we'll choose

- database: `example_database` (set by the `MONGO_URI` in the above `user-config.json`)
- collection: `config` (the default collection)
- document: _N/A_ (`config` collection must contain only a single document)

Then, in the `example_database` database, set the `config` collection's single document to be:
```JSON
{
    "SERVICES": {
            "service_2": {
                "name": "soap",
                "href": "soup.com",
            }
    }
}
```

This results in the following:

```typescript
import {config} from "@azure-iot/configuration";

config.initialize().then( () => {
    let mongoUri = config.getString("MONGO_URI");
    let servicesObject_1 = config.get("SERVICES");
    let service_2 = config.get(["SERVICES", "service_2"]);
    let serviceName_2 = config.getString(["SERVICES", "service_2", "name"]);

    // Now, we have:
    // mongoUri = "mongodb://localhost:27017/example_database"
    // servicesObject_1 = { "service_1": { "name": "foo", ... } }
    // service_2 = { "name": "soap", ... }
    // serviceName_2 = "soap"
});
```
## Using the default provider
This example uses the `env` provider to draw from environment variables, but falls back on the `default` provider which draws from the `defaultValues` objects passed to `config.initialize`.

Remember that the strict order of provider preference is `file`, `env`, `mongo`, and then `default`.

```typescript
import {config} from "@azure-iot/configuration";

async function example(): Promise<void> {
    // Set an environment variable
    process.env["SOUP"] = "soap";

    // Create an object of default values
    let defaultValues = {
        "FRUITS": ["cherries", "dates"],
        "REQUIRED_KEY": "bar"
    }

    // Asynchronously initialize the config service
    // with default values; won't return from initializing
    // until REQUIRED_KEY has a value
    await config.initialize(["REQUIRED_KEY"], defaultValues);

    // Get values from the config instance
    let soup = config.getString("soup");
    let fruits = config.get("FRUITS");
}

example().then(
    // Now, we have:
    // soup = "soap"
    // fruits = ["cherries", "dates"]
);
```

# Notes
### Recommended key casing
The below choices in key casing are best practices for the current usages of this library.

- Always prefer underscores to dashes (_e.g._ `foo_bar` rather than `foo-bar`)
- Top-level configuration keys should be in `SCREAMING_SNAKE_CASE` (all caps, underscores)
- All other configuration keys should be in `snake_case` (all lowercase, underscores)

### Recommended configuration schema
The below sample JSON file demonstrates best practices for organizing configuration variables.

```JSON
{
    "PORT": "9001",
    "IOTHUB_CONNECTION_STRING": "HostName=...",
    "CONSOLE_REPORTING": "both",
    "LOG_LEVEL": "warn",
    "SERVICES": {
        "service_1": {
            "href": "http://foo.com"
        },
        "service_2": {
            "href": "http://bar.com"
        }
    }
}
```

### Setting `MONGO_URI`
In order to utilize a `mongo` provider, the `MONGO_URI` configuration variable must be set by one of the other three providers. A good fallback is to set a default value for `MONGO_URI` in the `default` provider (passed as the `defaultValues` object to `config.initialize`).

### MongoDB notes
_Setting a source._ Choosing the database, collection, and document to source for configuration variables is shown below.

- Database: the DB to connect to should be included in the `MONGO_URI` configuration variable, _e.g._ `mongodb://localhost:27017/config_variables` connects to the `config_variables` DB on the localhost connection
- Collection: optional parameter to `config.initialize` method; defaults to `config`
- Document: currently, the chosen collection must contain only a single document

_Waiting for variables._ Let's say another microservice is inserting variables into the Mongo DB in parallel to the calling of `config.initialize`. By specifying the `requiredKeys` argument to `config.initialize`, the method will wait until all of the keys in `requiredKeys` have been found by _any_ provider. For example, to wait for the `SERVICES` key to appear in the `mongo` provider (and assuming there is no `SERVICES` key in either the `file` or `env` providers), you would initialize config with `config.initialize(["SERVICES"])`.

_Shallow reads._ Because `get` and `getString` are synchronous methods, reads to the `mongo` provider are necessarily shallow reads. To ensure that the provider has values for certain keys before returning from initialization, utilize the `requiredKeys` parameter to `config.initialize`.

### `get` vs `getString`
- `get<T>` returns `file`, `mongo`, and `default` values as-is, and attempts to `JSON.parse` top-level values from `env`; casts the return value `as T`
- `getString` returns all values as-is, and attempts to throw an error if the value is not a string

### Using providers directly
Each provider can also be used independently of `Configuration`. Specifically, the `MongoConfiguration` class can be used to set values through to a Mongo DB directly, as shown in the snippet below:

```typescript
import {MongoConfiguration} from "@azure-iot/configuration";

let mongoConfig = new MongoConfiguration();
await mongoConfig.initialize("mongodb://localhost:27017/test");
await mongoConfig.set("fruitKey", {"fruits": ["apple", "banana"]});
```
