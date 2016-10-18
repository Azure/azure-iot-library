/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {route, middleware, hal, provides, api} from '../api';
import {Method, LinkRelation, Hal} from '../types';

// Middleware functions
function first(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!res.locals.order) {
        res.locals.order = [];
    }
    res.locals.order.push('first');
    next();
}

function second(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!res.locals.order) {
        res.locals.order = [];
    }
    res.locals.order.push('second');
    next();
}

function cls(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!res.locals.order) {
        res.locals.order = [];
    }
    res.locals.order.push('class');
    next();
}

function err(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!res.locals.order) {
        res.locals.order = [];
    }

    res.locals.order.push('error');

    // If we're in the async case, make sure we call done *after* we've hit the error handler
    if ((req as any).done) {
        (req as any).done();
    }
    
    next();
}

// Create a class for testing decorator behavior
let TestApiName = 'test';
let TestApiDocs = 'http://www.contoso.com/docs/:rel';
let TestApiTemplate = 'http://www.contoso.com/docs/{rel}';
@provides(TestApiName, { href: TestApiDocs })
@middleware(cls)
@middleware(err, { error: true })
class TestApi {

    @route(Method.GET, '/default')
    @provides('default', { discoverable: true })
    @middleware(first)
    @hal('mixed', 'middleware', 'NoHalBehavior', LinkRelation.Index, 'template', 'duplicate')
    DefaultCase(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.link('extra');
        res.link('override', {
            rel: LinkRelation.Alternate,
            array: true
        });
        res.link('custom', {
            href: 'http://www.contoso.com'
        });
        res.link('template', {
            params: { id: 'name' }
        });
        res.link('query', {
            params: { value: 0 }
        });
        res.embed('extra', { value: 'test' });
        res.embed('custom', { value: 'test' }, { links: ['override'] });
        res.embed('parent', { value: 'parent' }).embed('child', { value: 'child' });
        
        res.json({
            simple: 'simple',
            complex: {
                value: 'value'
            }
        });
    }

    @hal('default')
    @provides('mixed')
    @route(Method.POST, '/mixed')
    @middleware(first)
    MixedOrderDecorators(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.json({});
    }

    @hal('default')
    @provides('middleware')
    @route(Method.PUT, '/middleware')
    @middleware(first)
    @middleware(second)
    MiddlewareExecutionOrder(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        throw new Error();
    }
    
    @route(Method.DELETE, '/NoHalBehavior')
    @provides()
    @middleware(first)
    NoHalBehavior(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/index')
    @provides(LinkRelation.Index)
    DefaultRel(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/extra')
    @provides('extra')
    @hal('default')
    Extra(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/override')
    @provides('override')
    Override(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/template/:id')
    @provides('template', { id: 'id' })
    Template(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/duplicate')
    @provides('duplicate')
    DuplicateGet(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.PUT, '/duplicate')
    @provides('duplicate')
    DuplicatePut(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/distinct')
    @provides('duplicate')
    DuplicateDistinct(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
    
    @route(Method.GET, '/fallthrough/:id')
    @hal('template', { self: false })
    ParameterFallthrough(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.json({});
    }

    @route(Method.GET, '/child')
    @provides('child')
    @hal('alt:cross')
    Child(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.json({});
    }

    @route('GET', '/query/{param}?q={value}')
    @provides('query')
    AsyncQuery(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.locals.param = req.params.param;
        return Promise.reject(new Error());
    }

    @route('GET', '/optional/:value?')
    Optional(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json(req.params);
    }
};

let AltApiName = 'alt';
let AltApiDocs = 'http://www.adatum.com/docs/{rel}';
@provides(AltApiName, { href: AltApiDocs })
@provides('secondary')
class AltApi {
    
    @route(Method.GET, '/cross')
    @provides('cross', { discoverable: true })
    @hal('test:default')
    CrossClassRel(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
}

let ParentApiName = 'parent';
let ParentApiDocs = `/docs/${ParentApiName}/{rel}`;
@provides(ParentApiName)
class ParentApi {}

class DynamicApi extends ParentApi {
    Handler(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }

    @route(Method.GET, '/inherited')
    @provides('inherited')
    Inherited(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
}

describe('HAL API Tests', () => {

    let testAPI: TestApi;
    let response: any;
    let request: any;
    let result: Hal.Resource;
    let router: express.Router;
    let app: express.Application;
    
    function call(method: string, url: string, done: Function) {
        request.url = url;
        request.method = method;
        request.next = {};

        app(request, response, <express.NextFunction>function(error: any){
            done(error);
        });
    }
    
    function single<T>(map: { [rel: string]: T | T[] }, rel: string): T {
        let item = map[rel];
        expect(item).toBeDefined();
        if (item instanceof Array) {
            throw new Error(`Expected ${rel} to not be an array.`);
        } else {
            return item;
        }
    }
    
    function array<T>(map: { [rel: string]: T | T[] }, rel: string): T[] {
        let item = map[rel];
        if (item instanceof Array) {
            return item;
        } else {
            throw new Error(`Expected ${rel} to be an array.`);
        }
    }
    
    function testStandardLink(hal: Hal.Resource, ns: string, rel: string) {
        expect(single(hal._links, `${ns}:${rel}`).href).toBe(`/api/${ns}/${rel}`);
    }
    
    function testCuries(hal: Hal.Resource, index: number, ns: string, href: string) {
        let curies = array(hal._links, 'curies');
        expect(curies[index]).toBeDefined();
        expect(curies[index].name).toBe(ns);
        expect(curies[index].href).toBe(href);
        expect(curies[index].templated).toBe(true);
    }

    beforeEach(() => {
        request = {};
        response = {};
        response.locals = {};
        response.json = (body: any) => {
            result = body;
        };
        response.setHeader = () => {};
        response.type = () => {};
        
        router = express();
        router.use('/test', route(new TestApi()));
        router.use('/alt', route(new AltApi()));

        router.get('/', hal.discovery);
        
        app = express();
        app.use('/api', router);
    });

    it('Should execute middleware in listed order', done => {
        call('put', 'http://localhost/api/test/middleware', done);
     
        expect(response.locals.order[0]).toEqual('class');
        expect(response.locals.order[1]).toEqual('first');
        expect(response.locals.order[2]).toEqual('second');
        expect(response.locals.order[3]).toEqual('error');
 
        done();
    });


    it('Should respond with native JSON when no Heatoes behavior defined', done => {
        call('delete', 'http://localhost/api/test/NoHalBehavior', done);
        
        expect(result).toBeDefined();
        expect(result._links).toBeFalsy();
        
        done();
    });
    
    
    it('Should return expected HAL result', done => {
        call('get', 'http://localhost/api/test/default?test=true', done);

        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        
        // Test self link
        expect(single(result._links, 'self').href).toBe('/api/test/default?test=true');
        
        // Test curies
        testCuries(result, 0, TestApiName, TestApiTemplate);
        testCuries(result, 1, AltApiName, AltApiDocs);
        
        // Test standard links
        testStandardLink(result, TestApiName, 'mixed');
        testStandardLink(result, TestApiName, 'middleware');
        testStandardLink(result, TestApiName, 'NoHalBehavior');
        
        // Test link-relation links
        expect(single(result._links, 'index').href).toBe('/api/test/index');
        
        // Test templated links
        let templates = array(result._links, `${TestApiName}:template`);
        expect(templates.length).toBe(2);
        expect(templates[0].href).toBe('/api/test/template/{id}');
        expect(templates[0].templated).toBe(true);
        expect(templates[1].href).toBe('/api/test/template/name');
        expect(templates[1].name).toBe('name');

        // Test query- and URI-templated links
        let query = single(result._links, `${TestApiName}:query`);
        expect(query.href).toBe('/api/test/query/{param}?q=0');
        expect(query.templated).toBe(true);
        
        // Test duplicate links
        let duplicates = array(result._links, `${TestApiName}:duplicate`);
        expect(duplicates.length).toBe(2);
        expect(duplicates[0].href).toBe('/api/test/duplicate');
        expect(duplicates[1].href).toBe('/api/test/distinct');
        
        // Test added links
        testStandardLink(result, TestApiName, 'extra');
        expect(result._links[`${TestApiName}:override`]).toBeUndefined();
        expect(single(result._links, `${TestApiName}:custom`).href).toBe('http://www.contoso.com');
        let alternates = array(result._links, 'alternate');
        expect(alternates.length).toBe(1);
        expect(alternates[0].href).toBe('/api/test/override');
        
        // Test embedded objects
        expect(result._embedded).toBeDefined();
        
        let extraEmbedded = single(result._embedded, `${TestApiName}:extra`);
        expect(extraEmbedded).toBeDefined();
        expect(extraEmbedded['value']).toBe('test');
        expect(extraEmbedded._links).toBeDefined();
        expect(single(extraEmbedded._links, 'self').href).toBe('/api/test/extra');
        testStandardLink(extraEmbedded, TestApiName, 'default');
        
        let customEmbedded = single(result._embedded, `${TestApiName}:custom`);
        expect(customEmbedded).toBeDefined();
        expect(customEmbedded['value']).toBe('test');
        expect(customEmbedded._links).toBeDefined();
        expect(customEmbedded._links['self']).toBeUndefined();
        testStandardLink(customEmbedded, TestApiName, 'override');

        let parentEmbedded = single(result._embedded, `${TestApiName}:parent`);
        expect(parentEmbedded).toBeDefined();
        expect(parentEmbedded['value']).toBe('parent');
        expect(parentEmbedded._links).toBeUndefined();
        expect(parentEmbedded._embedded).toBeDefined();

        let childEmbedded = single(parentEmbedded._embedded, `${TestApiName}:child`);
        expect(childEmbedded).toBeDefined();
        expect(childEmbedded['value']).toBe('child');
        expect(childEmbedded._links).toBeDefined();
        expect(single(childEmbedded._links, 'self').href).toBe('/api/test/child');
        expect(childEmbedded._links['curies']).toBeUndefined();
        testStandardLink(childEmbedded, AltApiName, 'cross');
 
        // Test content
        expect(result['simple']).toBe('simple');
        expect(result['complex']).toBeDefined();
        expect(result['complex'].value).toBe('value');

        done();
    });
    

    it('Cross-class rels should link properly', done => {
        call('get', 'http://localhost/api/alt/cross', done);
        
        // Test curies
        testCuries(result, 0, TestApiName, TestApiTemplate);
     
        // Test link
        testStandardLink(result, TestApiName, 'default');
 
        done();
    });
    
    it('Discoverable routes should be discoverable', done => {
        call('get', 'http://localhost/api/', done);
        
        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        
        // Test curies
        testCuries(result, 0, TestApiName, TestApiTemplate);
        testCuries(result, 1, AltApiName, AltApiDocs);
     
        // Test links
        testStandardLink(result, TestApiName, 'default');
        testStandardLink(result, AltApiName, 'cross');
        
        done();
    });
    
    it('Parameters should fall through to subsequent links', done => {
        call('get', 'http://localhost/api/test/fallthrough/name', done);
        
        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        expect(single(result._links, `${TestApiName}:template`).href).toBe('/api/test/template/name');
        expect(result._links['self']).toBeUndefined();
 
        done();
    });

    it('Ensure async, query-parameter, and URI-templated routes are callable', done => {
        request.done = (error: any) => {
            if (!error) {
                expect(response.locals.param).toBe('param');
            }
            done(error);
        };
        call('get', 'http://localhost/api/test/query/param?q=value', done);
    });

    it('Ensure optional routes are callable in both forms', done => {
        call('get', 'http://localhost/api/test/optional', done);

        expect(result).toBeDefined();
        expect((result as any).value).toBeUndefined();

        call('get', 'http://localhost/api/test/optional/value', done);

        expect(result).toBeDefined();
        expect((result as any).value).toBe('value');

        done();
    });

    it('Dynamic decorators function as well as the standard decorators', done => {
        let dyn = new DynamicApi();

        api(dyn)
            .middleware(cls);
        api(dyn, 'Handler')
            .route('GET', '/handler')
            .middleware(first)
            .middleware(second)
            .hal('test:default', 'parent:inherited');

        router.use('/dynamic', route(dyn));

        call('get', 'http://localhost/api/dynamic/handler', done);

        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        
        // Test self link
        expect(single(result._links, 'self').href).toBe('/api/dynamic/handler');

        // Test curies
        testCuries(result, 0, TestApiName, TestApiTemplate);
        testCuries(result, 1, ParentApiName, '/api/dynamic' + ParentApiDocs);
     
        // Test dynamic link
        testStandardLink(result, TestApiName, 'default');

        // Test inherited link
        expect(single(result._links, `${ParentApiName}:inherited`).href).toBe('/api/dynamic/inherited');

        // Test execution order
        expect(response.locals.order[0]).toEqual('class');
        expect(response.locals.order[1]).toEqual('first');
        expect(response.locals.order[2]).toEqual('second');

        done();
    });
});