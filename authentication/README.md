# @azure-iot/authentication

This library provides support for user authentication in Azure IoT microservices.

# Developer Setup

__1. Install Node__

Node can be found [here](https://nodejs.org)

__2. npm install__

This will download and install all dependencies required to build this script.
    
__3. npm run build__

This will build the project, putting the output into the `src` folder.

# Usage
This library provides the `Authentication` module, which takes in an express
application and a few configuration values, and returns a middleware that the
application can use on routes to ensure the user is authenticated.

Internally, the library sets up an express session and a passport session, both
backed by mongodb, to ensure the `req.user` object contains the authenticated 
user information correctly when the route is executed.

This module does not actually authenticate against an OAuth providers directly: 
it merely sets up passport so the user is redirected to a specified login URL 
(typically hosted on a different service), which will then perform the authentication
and redirect back to the page the user was originally trying to visit.

## Example
```typescript
import {Authentication} from '@azure-iot/authentication';

const app = express();
const auth = await Authentication.initialize(
    app, // an express application
    'http://shell/login', // URL of the login page
    'keyboard cat', // password to encrypt user sessions
    'mongodb://localhost:27071'); // URI of the mongodb instance

app.get('/', auth.ensureAuthentication, (req, res) => res.sendStatus(200));
```

### Control flow

1. `Authentication.initialize` initializes express and passport sessions backed by mongodb.
2. User requests a service route (e.g., `http://localhost:3000/`) that specifies 
   `auth.ensureAuthentication` as a middleware.
3. Express creates a new session for the user and stores it in mongo.
4. The Auth middleware sees that Passport hasn't authenticated the user, stores 
   the current URL (`http://localhost:3000/`) in the session, and redirects the
   user to the login page (in our example, `http://shell/login`).
5. Passport (running in the Shell service as a middleware to the `/login` route)
   sees that the user is not authenticated, and redirects to the OAuth provider
   (in our case, AAD) to actually authenticate the user.
6. AAD asks for the user's credentials (or redirects to a federated AD instance
   which will ask for the credentials), and redirects back to a callback page
   in Shell with the user's tokens (e.g., `http://shell/auth/aad/return?code=foo&id_token=...`)
7. Passport parses the returned tokens (which contains information like the user's
   name, unique id, and email), and gives it to Shell.
8. Shell creates a new `User` entry in mongo (if one with the specified unique id 
   doesn't already exist), and gives it to Passport.
9. Passport stores the user's unique id in the express session (using serialization
   code specified in the Authentication module.)
10. Shell redirects back to the user's original URL (stored in the session in step 4.)
11. Back in the original service, Express picks up the session id stored in the cookie,
   and retrieves the full session information from mongo.
12. Passport retrieves the user information specified in the session, and makes it
   available to other request handlers in the `req.user` property.
13. The Auth middleware sees that Passport has authenticated the user, and calls the
   next request handler. 

## Full example
This library will most likely be used only in a production environment, with 
the configuration fetched from the Config service. The following code demonstrates
a helper module that a service can use to query the config service and initialize
authentication with retry logic (for production environment, in case the config
service hasn't been initialized yet), and fallback logic (for dev purposes, 
when the config needs to be fetched from a file instead of the config service.)

```typescript
import * as express from 'express';
import * as request from 'request';
import {Authentication} from '@azure-iot/authentication';

export class Config {
    constructor(
        public IotHubConnectionString: string,
        public EnsureAuthentication: express.RequestHandler) {}
        
    public static async initialize(app: express.Express): Promise<Config> {
        const waitForConfig = process.env.NODE_ENV === 'production';
        const configUrl: string = process.env.CONFIG_URL || 'http://localhost:3009';
        
        let result: Config = null;
        do {
            try {
                const discovery = await getHal<void>(configUrl + '/api/discovery');
                
                const settingsLink = discovery._links['settings:list'];
                if (!settingsLink) throw new Error('Config service does not provide settings:list');
        
                const configSettings = await getHal<ConfigSettings>(configUrl + settingsLink.href);
                if (!configSettings.iotHubConnStr) throw new Error('Config service does not provide setting "iotHubConnStr"');
                if (!configSettings.loginUrl) throw new Error('Config service does not provide setting "loginUrl"');
                if (!configSettings.mongoUri) throw new Error('Config service does not provide setting "mongoUri"');
                if (!configSettings.sessionSecret) throw new Error('Config service does not provide setting "sessionSecret"');
                
                const auth = await Authentication.initialize(
                    app,
                    configSettings.loginUrl,
                    configSettings.sessionSecret,
                    configSettings.mongoUri);
                
                return new Config(
                    configSettings.iotHubConnStr,
                    auth.ensureAuthenticated);
            } catch (err) {
                process.stderr.write(`WARNING: Could not initialize from Config Service: ${err}.\n`);
                if (waitForConfig) {
                    // wait for 5 seconds before retrying:
                    await new Promise((resolve, reject) => setTimeout(resolve, 5000));         
                } else {
                    // we're in dev mode. Get config from file, and use empty 
                    // middleware for authentication.
                    const userConfigFile = path.join(__dirname, '../user-config.json');
                    if (!fs.existsSync(userConfigFile)) {
                        console.log('Unable to find the user configuration: please fill out the information in ' + userConfigFile);
                        process.exit(1);
                    }

                    let userConfig: {
                        IotHubConnectionString: string;
                    } = require(userConfigFile);

                    return new Config(
                        userConfig.IotHubConnectionString,
                        (req, res, next) => next()); // empty middleware
                }
            }
        } while (!result);
    }
}

interface ConfigSettings {
    iotHubConnStr: string;
    loginUrl: string;
    mongoUri: string;
    sessionSecret: string;
    'device-management': {
        logLevel: string;
        consoleReporting: string;
    };
}

interface HalLink {
    href: string;
}

interface HalResponse {
    _links: {
        self: HalLink;
        [rel: string]: HalLink;
    };
}

async function getHal<T>(uri: string) {
    return new Promise<T & HalResponse>((resolve, reject) => {        
        request.get(uri, {json: true}, (err, response, body) => {
            err ? reject(err) : resolve(body);
        });
    });
}
```