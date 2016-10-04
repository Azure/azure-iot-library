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
This library provides the main `Configuration` module, which exports the `config` singleton to create a dictionary-like interface of configuration values. Once initialized, `config` provides the `getSecret`, `getString` and generic `get<T>` methods, described further below.

## Providers
Configuration keys are mapped to values from one of four optional _providers_, in order of preference:

- `file`: JSON file at `./user-config.json`
- `env`: environment variables
- `mongo`: Mongo DB at the address of the `MONGO_URI` configuration variable
- `default`: default values passed as an optional argument to `config.initialize`

The first provider to return a value other than `null` is considered authoritative. For example, if both the `file` and `default` providers contained a value for the same key, the `file` provider would be authoritative.

The library also provides support for fetching secret configuration values
from KeyVault, using a separate `keyVault` provider. This credentials to
initialize the connection to KeyVault is fetched from the other providers
listed below, but once set up, secrets are fetched using a separate `getSecret`
API, not the usual `getString` and `get<T>` methods. The examples listed
below demonstrate how to read and write secrets from KeyVault.

## Setting variables
Configuration variables only need to be set for one configuration provider. Variables can be set for each of the providers in the following ways:

- `file` provider: include the key-value pair in `./user-config.json`
- `env` provider: set an environment variable; for non-string values, set the stringified version of the object
- `mongo` provider: either set key-value pairs directly, or use `MongoConfiguration.set`
- `default` provider: include the key-value pair in the optional `defaultValues` parameter for `config.initialize`


- `keyVault` provider: set the secret using the [Azure XPlat CLI](https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/),
    provide the values to authenticate with keyvault using the other providers listed below,
    and then fetch secrets using the `getSecret` method.


See the __Example__ section for more.


## Getting variables
The `config` singleton (and each provider) implements the `IConfiguration` interface, which provides the `get<T>`, `getString`, and `getSecret` methods:

- `get<T>(key)`: use when you expect the returned value to be anything other than a string; _e.g._ an object, array, etc.
- `getString(key)`: use when you expect the returned value to be a string
- `getSecret(key)`: use then you have to fetch secrets from KeyVault.

Both methods return `null` if no value is set for the passed key.

The `key` parameter can be either a string or an array of strings. If `key` is a string, `get` and `getString` return the associated value. If `key` is an array, however, `get` and `getString` will walk down through a nested object to return the associated value. For example:

```typescript
// Let's say config.get('KEY') -> { 'fruits': ['apples', 'bananas'] }

let outerValue = config.get('KEY');
let innerValue = config.get(['KEY', 'fruits']);
let missingValue = config.get(['KEY', 'vegetables']);

// This leaves us with:
// outerValue = { 'fruits': ['apples', 'bananas'] }
// innerValue = ['apples', 'bananas']
// missingValue = null

// Fetching secrets:
// let's say config.get("AAD_SECRET") -> { "id": "https://foo.vault.azure.net/secrets/aad-secret"}
const aadSecret = await config.getSecret('AAD_SECRET');

// This will fetch the keyvault secret's URL from other providers,
// fetch the secret value from keyvault, and return an object with
// the following format:
aadSecret = {
    id: "https://foo.vault.azure.net/secrets/aad-secret",
    value: "<secret value>"
}
```

## Initializing `config`
The `config` singleton takes a single, optional `ConfigOptions` argument to its asynchronous `initialize` call. The `ConfigOptions` object contains a number of options, including:

- `defaultValues`: an object of key-value pairs which serve as default values---_i.e._ `defaultValues` is consulted if all other providers return `null`; defaults to an empty object
- `requiredKeys`: an array of variable names which must be assigned a value before returning from the initialization; defaults to an empty array
- `configFilename`: the location of the JSON file provider relative to the calling process's working directory; defaults to `./user-config.json`
- `logger`: function to call in place of `console.log`

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
    "MONGO_URI": "mongodb://localhost:27017",
    "MONGO_CONFIG_DB": "config-db",
    "MONGO_CONFIG_COLLECTION": "config-collection",
    "SHARED_KEY": null
}
```
This means, _e.g._, `config.getString(['services', 'service_1', 'name']) -> 'foo'`.

Now, to provision a `mongo` provider with `service_2`, we'll choose

- database: `config-db` (set by the `MONGO_CONFIG_DB` in the above `user-config.json`)
- collection: `config-collection` (set by the `MONGO_CONFIG_COLLECTION` in the above `user-config.json`)
- document: _N/A_ (the collection must contain only a single document)

Then, in the `config-db` database, set the `config-collection` collection's single document to be:
```JSON
{
    "SERVICES": {
            "service_2": {
                "name": "soap",
                "href": "soup.com",
            }
    },
    "SHARED_KEY": "sap"
}
```

This results in the following:

```typescript
import {config} from '@azure-iot/configuration';

config.initialize().then( () => {
    let mongoUri = config.getString('MONGO_URI');
    let servicesObject_1 = config.get('SERVICES');
    let service_2 = config.get(['SERVICES', 'service_2']);
    let serviceName_2 = config.getString(['SERVICES', 'service_2', 'name']);
    let sharedKey = config.getString('SHARED_KEY');

    // Now, we have:
    // mongoUri = 'mongodb://localhost:27017'
    // servicesObject_1 = { 'service_1': { 'name': 'foo', ... } }
    // service_2 = { 'name': 'soap', ... }
    // serviceName_2 = 'soap'
    // sharedKey = 'sap'
});
```
## Using the default provider
This example uses the `env` provider to draw from environment variables, but falls back on the `default` provider which draws from the `defaultValues` objects passed to `config.initialize`.

Remember that the strict order of provider preference is `file`, `env`, `mongo`, and then `default`.

```typescript
import {config} from '@azure-iot/configuration';

async function example(): Promise<void> {
    // Set an environment variable
    process.env['SOUP'] = 'soap';

    // Create an object of default values
    let defaultValues = {
        'FRUITS': ['cherries', 'dates'],
        'REQUIRED_KEY': 'bar'
    }

    // Asynchronously initialize the config service
    // with default values; won't return from initializing
    // until REQUIRED_KEY has a value
    await config.initialize({
        requiredKeys: ['REQUIRED_KEY'],
        defaultValues: defaultValues
    });

    // Get values from the config instance
    let soup = config.getString('soup');
    let fruits = config.get('FRUITS');
}

example().then(
    // Now, we have:
    // soup = 'soap'
    // fruits = ['cherries', 'dates']
);
```

## Using the KeyVault provider
1.  Initialize the connection to KeyVault with the authentication parameters.
    Ensure you have the following configuration available in the
    file/env/mongo/default providers:

    ```
    KEYVAULT: {
        clientId: '<Client ID of the AAD application that has access to the KeyVault>',
        certFile: '<Path to the service principal's certificate>',
        certThumbprint: '<Thumbprint of the service principal's certificate>'
    },
    ```

    The `config.initialize` method initializes the keyvault provider only if the
    `KEYVAULT` configuration value is present in one of the other providers.

2.  Once initialized, call the `getSecret` method to fetch the secret value from KeyVault:
    ```typescript
    // Fetching secrets:
    // let's say config.get("AAD_SECRET") -> { "id": "https://foo.vault.azure.net/secrets/aad-secret"}
    const aadSecret = await config.getSecret('AAD_SECRET');

    // This will fetch the keyvault secret's URL from other providers,
    // fetch the secret value from keyvault, and return an object with
    // the following format:
    aadSecret = {
        id: "https://foo.vault.azure.net/secrets/aad-secret",
        value: "<secret value>"
    }
    ```

### Add secrets to KeyVault:
1.  Install the [Azure XPlat CLI](https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/)
2.  `azure login`
3.  `azure account set <subscription name>`
4.  Create the KeyVault, if you don't already have one:
    ```
    azure keyvault create <vault-name> <resource-group> <location>
    ```
5.  Add secrets to KeyVault:
    ```
    azure keyvault secret set <vault-name> <secret-name> <secret-value>
    ```

### Create a service principal with access to KeyVault:
1.  Create RSA cert
    From https://unix.stackexchange.com/questions/131334/obtain-cer-file-from-pem-file
    ```
    openssl genrsa -out keyvault.pem 4096
    ```

2.  Create celf-signed x509 cert:
    ```
    openssl req -new -x509 -key keyvault.pem -out keyvault.cacert.pem -days 365
    ```

3.  Convert .pem file to .cer:
    ```
    openssl x509 -inform PEM -in keyvault.cacert.pem -outform DER -out keyvault.cer
    ```

4.  In powershell:
    From https://azure.microsoft.com/en-us/documentation/samples/active-directory-dotnet-daemon-certificate-credential/

    ```ps
    $cer = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $cer.Import(".\keyvault.cer")
    $bin = $cer.GetRawCertData()
    $base64Value = [System.Convert]::ToBase64String($bin)
    $bin = $cer.GetCertHash()
    $base64Thumbprint = [System.Convert]::ToBase64String($bin)
    $keyid = [System.Guid]::NewGuid().ToString()
    ```

4.  Download manifest of AAD app

5.  Open the manifest if your favorite text editor, and replace the keyCredentials property with your new certificate information from above, using the following schema:
    ```json
    "keyCredentials": [
        {
            "customKeyIdentifier": "$base64Thumbprint_from_above",
            "keyId": "$keyid_from_above",
            "type": "AsymmetricX509Cert",
            "usage": "Verify",
            "value":  "$base64Value_from_above"
        }
    ]
    ```

6.  Save the edits to the application manifest, and upload it back into Azure AD by clicking Manage Manifest --> Upload Manifest. Note that the keyCredentials property is multi-valued, so you may upload multiple certificates for richer key managemnent.

7.  Get the Object ID of the AAD app's service principal:
    ```
    > azure ad sp show --spn <aad client id>
    info:    Executing command ad sp show
    + Getting Active Directory service principals
    data:    Object Id:               <object id of the service principal>
    ```

8.  Give the AAD Keyvault app access to the keyvault:
    ```
    azure keyvault set-policy <vault-name> --object-id <object-id-of-spn> --perms-to-secrets "[\"get\"]"
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
In order to utilize a `mongo` provider, the `MONGO_URI` configuration variable must be set by one of the other three providers. If no value is found for `MONGO_URI`, `config.initialize` will not attempt to connect to a Mongo DB. A good fallback is to set a default value for `MONGO_URI` in the `default` provider (passed as the `defaultValues` object to `config.initialize`).

### MongoDB notes
_Setting a source._ Choosing the database, collection, and document to source for configuration variables is shown below.

- Database: utilized DB is pulled from the `MONGO_CONFIG_DB` configuration variable; defaults to `config`
- Collection: the utilized collection is pulled from the `MONGO_CONFIG_COLLECTION` configuration variable; defaults to `config`
- Document: currently, the chosen collection must contain only a single document

_Waiting for variables._ Let's say another microservice is inserting variables into the Mongo DB in parallel to the calling of `config.initialize`. By specifying the `requiredKeys` argument to `config.initialize`, the method will wait until all of the keys in `requiredKeys` have been found by _any_ provider. For example, to wait for the `SERVICES` key to appear in the `mongo` provider (and assuming there is no `SERVICES` key in either the `file` or `env` providers), you would initialize config with `config.initialize({requiredKeys: ['SERVICES']})`.

_Shallow reads._ Because `get` and `getString` are synchronous methods, reads to the `mongo` provider are necessarily shallow reads. To ensure that the provider has values for certain keys before returning from initialization, utilize the `requiredKeys` parameter to `config.initialize`.

### `get` vs `getString`
- `get<T>` returns `file`, `mongo`, and `default` values as-is, and attempts to `JSON.parse` top-level values from `env`; casts the return value `as T`
- `getString` returns all values as-is, and attempts to throw an error if the value is not a string

### Using providers directly
Each provider can also be used independently of `Configuration`. Specifically, the `MongoConfiguration` class can be used to set values through to a Mongo DB directly, as shown below:

```typescript
import {MongoConfiguration} from '@azure-iot/configuration';

async function usingProviders() {
    let mongoConfig = new MongoConfiguration();
    await mongoConfig.initialize({
        mongoUri: 'mongodb://localhost:27017'
    });
    await mongoConfig.set('fruitKey', {'fruits': ['apple', 'banana']});
}

usingProviders().then(
    // Now, the config collection of the config DB on the
    // localhost connection should contain the fruitKey
    // variable
)
```
