/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';
import * as expressSession from 'express-session';
import * as passport from 'passport';
import * as mongo from 'mongodb';
import * as connectMongo from 'connect-mongo';
const MongoStore = connectMongo(expressSession);

interface User {
    provider: string,
    id: string
}

export class Authentication {
    /**
     * An Express middleware that ensures the user is authenticated.
     * If not, the user is redirected to the Solution's login page, which 
     * will authenticate against an OAuth provider and redirect back to
     * the original page after.
     */
    public ensureAuthenticated: express.RequestHandler;
    
    /**
     * Collection of objects intended only for the login page, to be
     * used for authenticating against OAuth providers.
     */
    public _loginPage: {
        users: mongo.Collection
    };
    
    /** 
    * Initializes authentication support for an Express application. 
    * @param {express.Express} app An Express application.
    * @param {string} loginUrl URL of the login page.
    * @param {string} sessionSecret The password to use for encrypting user sessions.
    * @param {string} mongoUri The URI of the Mongo DB.
    * @return {Authentication}
    */
    public static async initialize(
        app: express.Express, 
        loginUrl: string,
        sessionSecret: string,
        mongoUri: string): Promise<Authentication> 
    {
        // connect to mongodb and use database 'auth':
        const db = await new Promise<mongo.Db>((resolve, reject) => 
            mongo.MongoClient.connect(mongoUri + '/auth', (err, result) => err ? 
                reject(`Could not connect to ${mongoUri}: ${err}`) : 
                resolve(result)));
        
        const users = db.collection('users');
        await users.createIndex({id: 1, provider: 1}, {unique: true});
        
        // users can be uniquely identified by the mongo object ID:
        // specify scheme for serializing the unique id into the session:
        passport.serializeUser((user: User, done) => {
            done(null, `${user.provider}/${user.id}`);
        });
                
        passport.deserializeUser(async function(userSessionId: string, done) {
            try {
                const index = userSessionId.indexOf('/');
                if (index === -1) throw new Error('invalid user session id');
                
                const cursor = users.find({
                    id: userSessionId.substring(index + 1),
                    provider: userSessionId.substring(0, index)
                });
                
                if (await cursor.hasNext()) {
                    const user: User = await cursor.next();
                    done(null, user);
                } else {                    
                    throw new Error('no results returned');
                }
            } catch (err) {
                done(`Could not find user with specified id: ${err}'`, null)
            }
        });
        
        app.use(expressSession({ 
            secret: sessionSecret, 
            store: new MongoStore({
                db: db,            
                collection: 'sessions'
            }),
            resave: false, // connect-mongo implements touch 
            saveUninitialized: false }));
        app.use(passport.initialize());
        app.use(passport.session());
        
        const ensureAuthenticated = (req: express.Request, res: express.Response, next) => {
            if (!req.isAuthenticated()) {    
                // construct the current URL. Our services run on different 
                // ports right now, so we need to preserve the full URL with
                // possible nonstandard ports, which only the http host header
                // provides. 
                req.session['returnTo'] = `${req.protocol}://${req.get('host')}${req.originalUrl || req.url}`;
                res.redirect(loginUrl);
            } else { 
                next(); 
            }
        };
        
        const result = new Authentication();
        result.ensureAuthenticated = ensureAuthenticated;
        result._loginPage = {
            users: users
        };
        
        return result;
    }
}
