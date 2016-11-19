/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as express from 'express';

import {route, middleware, hal, provides, filter, api} from '../api';
import {Method, LinkRelation, Hal, Template} from '../types';

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
    (req as any).resolve();
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
    @hal('mixed', 'middleware', 'NoHalBehavior', LinkRelation.Index, 'template', 'duplicate', 'extended')
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
            params: { id: 'name' },
            href: { query: { query: 'string' } }
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
        res.locals.param = req.params['param'];
        return Promise.reject(new Error());
    }

    @route('GET', '/optional/:value?')
    Optional(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json(req.params);
    }

    @route('GET', '/filter')
    @middleware(first)
    @filter(req => req.query['filter'] === 'true')
    FilterFirst(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({ value: 'first' });
    }

    @route('GET', '/filter')
    @middleware(second)
    FilterSecond(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({ value: 'second' });
    }
};

@provides(TestApiName, { href: TestApiDocs })
class ExtendedApi {
    @route(Method.GET, '/extended')
    @provides('extended')
    Extended(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }
}

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

    @route(Method.GET, '/discoverable')
    @provides('discoverable', { discoverable: true })
    DiscoverableTrue(req: express.Request, res: express.Response, next: express.NextFunction) {
        res.json({});
    }

    @route(Method.POST, '/undiscoverable')
    @provides('discoverable')
    DiscoverableFalse(req: express.Request, res: express.Response, next: express.NextFunction) {
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

let AutoDoc = {
    description: 'A description for automatic documentation.',
    lazy: 'A lazy description for automatic documentation.',
    path: `/docs/list/{rel}`,
    fallback: {
        rel: 'fallback',
        href: '/fallback',
        verb: 'GET',
        description: 'A fallback description for automatic documentation.'
    }
};
function FallbackCallback(ns: string, rel: string): Template {
    return rel !== AutoDoc.fallback.rel ? {} : {
        routes: [{
            href: AutoDoc.fallback.href,
            methods: [{
                verb: AutoDoc.fallback.verb,
                options: {
                    description: AutoDoc.fallback.description
                }
            }]
        }]
    };
}
@provides('list', { fallback: FallbackCallback })
class ListApi {
    @route(Method.GET, '/item')
    @provides('item', { description: AutoDoc.description, array: true })
    @hal('list')
    Item(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.json({});
    }

    @route(Method.GET, '/list')
    @provides('list', { description: () => AutoDoc.lazy })
    @hal()
    List(req: express.Request, res: express.Response & hal.Response, next: express.NextFunction) {
        res.link('item', {
            rel: LinkRelation.Item
        });
        res.json({});
    }
}

describe('HAL API Tests', () => {

    let server = {
        test: new TestApi(),
        extended: new ExtendedApi(),
        alt: new AltApi(),
        parent: new ParentApi(),
        dynamic: new DynamicApi(),
        list: new ListApi()
    };
    let response: any;
    let request: any;
    let router: express.Router;
    let app: express.Application;
    
    function call(method: string, url: string) {
        return new Promise((resolve, reject) => {
            let resfn = (body: any) => (resolve(body), response);
            request = { url, method, next: {}, resolve };
            response = {
                locals: {},
                json: resfn,
                send: resfn,
                setHeader: () => response,
                type: () => response,
                status: () => response
            };
            app(request, response, (error: any) => error ? reject(error) : resolve());
        });
    }
    
    function single<T>(map: { [rel: string]: T | T[] } = {}, rel: string): T {
        let item = map[rel];
        expect(item).toBeDefined();
        if (item instanceof Array) {
            throw new Error(`Expected ${rel} to not be an array.`);
        } else {
            return item;
        }
    }
    
    function array<T>(map: { [rel: string]: T | T[] } = {}, rel: string): T[] {
        let item = map[rel];
        expect(item).toBeDefined();
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

    (function beforeAll() {
        router = express();
        router.use('/test', route(server.test));
        router.use('/alt', route(server.alt));
        router.use('/list', route(server.list));

        router.get('/', hal.discovery);
        
        app = express();
        app.use('/api', router);
        app.use('/extended', route(server.extended));
    })();

    it('Should execute middleware in listed order', done => {
        call('put', 'http://localhost/api/test/middleware').then(() => {

            expect(response.locals.order[0]).toBe('class');
            expect(response.locals.order[1]).toBe('first');
            expect(response.locals.order[2]).toBe('second');
            expect(response.locals.order[3]).toBe('error');

        }).then(done).catch(done.fail);
    });

    it('Should respond with native JSON when no HAL behavior defined', done => {
        call('delete', 'http://localhost/api/test/NoHalBehavior').then((result: Hal.Resource) => {

            expect(result).toBeDefined();
            expect(result._links).toBeFalsy();

        }).then(done).catch(done.fail);
    });
    
    it('Should return expected HAL result', done => {
        call('get', 'http://localhost/api/test/default?test=true').then((result: Hal.Resource) => {

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
            expect(templates[1].href).toBe('/api/test/template/name?query=string');
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
            expect(result._links![`${TestApiName}:override`]).toBeUndefined();
            expect(single(result._links, `${TestApiName}:custom`).href).toBe('http://www.contoso.com');
            let alternates = array(result._links, 'alternate');
            expect(alternates.length).toBe(1);
            expect(alternates[0].href).toBe('/api/test/override');

            // Test shared-namespace links
            expect(single(result._links, `${TestApiName}:extended`).href).toBe('/extended/extended');
            
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
            expect(customEmbedded._links!['self']).toBeUndefined();
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
            expect(childEmbedded._links!['curies']).toBeUndefined();
            testStandardLink(childEmbedded, AltApiName, 'cross');
    
            // Test content
            expect(result['simple']).toBe('simple');
            expect(result['complex']).toBeDefined();
            expect(result['complex'].value).toBe('value');

        }).then(done).catch(done.fail);
    });
    
    it('Cross-class rels should link properly', done => {
        call('get', 'http://localhost/api/alt/cross').then((result: Hal.Resource) => {
        
            // Test curies
            testCuries(result, 0, TestApiName, TestApiTemplate);
        
            // Test link
            testStandardLink(result, TestApiName, 'default');
 
        }).then(done).catch(done.fail);
    });
    
    it('Discoverable routes should be discoverable', done => {
        let testDiscovery = (result: Hal.Resource) => {

            // Test _links
            expect(result).toBeDefined();
            expect(result._links).toBeDefined();
            
            // Test curies
            testCuries(result, 0, TestApiName, TestApiTemplate);
            testCuries(result, 1, AltApiName, AltApiDocs);
        
            // Test links
            testStandardLink(result, TestApiName, 'default');
            testStandardLink(result, AltApiName, 'cross');
            testStandardLink(result, AltApiName, 'discoverable');

        };

        testDiscovery(hal.discovery({ originalUrl: 'http://localhost/api/', params: {} } as any));

        call('get', 'http://localhost/api/').then(testDiscovery).then(done).catch(done.fail);
    });
    
    it('Parameters should fall through to subsequent links', done => {
        call('get', 'http://localhost/api/test/fallthrough/name').then((result: Hal.Resource) => {
        
            // Test _links
            expect(result).toBeDefined();
            expect(result._links).toBeDefined();
            expect(single(result._links, `${TestApiName}:template`).href).toBe('/api/test/template/name');
            expect(result._links!['self']).toBeUndefined();
 
        }).then(done).catch(done.fail);
    });

    it('Ensure async, query-parameter, and URI-templated routes are callable', done => {
        call('get', 'http://localhost/api/test/query/param?q=value').then(() => {

            expect(response.locals.param).toBe('param');
            
        }).then(done).catch(done.fail);
    });

    it('Ensure optional routes are callable in both forms', done => {
        call('get', 'http://localhost/api/test/optional').then((result: any) => {

            expect(result).toBeDefined();
            expect(result.value).toBeUndefined();

        }).then(() => call('get', 'http://localhost/api/test/optional/value')).then((result: any) => {

            expect(result).toBeDefined();
            expect(result.value).toBe('value');

        }).then(done).catch(done.fail);
    });

    it('Dynamic decorators function as well as the standard decorators', done => {
        api(server.dynamic)
            .middleware(cls);
        api(server.dynamic, 'Handler')
            .route('GET', '/handler')
            .middleware(first)
            .middleware(second)
            .hal('test:default', 'parent:inherited');

        router.use('/dynamic', route(server.dynamic));

        call('get', 'http://localhost/api/dynamic/handler').then((result: Hal.Resource) => {

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
            expect(response.locals.order[0]).toBe('class');
            expect(response.locals.order[1]).toBe('first');
            expect(response.locals.order[2]).toBe('second');

        }).then(done).catch(done.fail);
    });

    it('Overridden rels do not provide their original CURIEs', done => {
        call('get', `http://localhost/api/list/list`).then((result: Hal.Resource) => {

            // Test _links
            expect(result).toBeDefined();
            expect(result._links).toBeDefined();

            // CURIEs do not get populated...
            expect(result._links!['curies']).toBeUndefined();

            // ... but the links do
            expect(array(result._links, 'item')[0].href).toBe('/api/list/item');

        }).then(done).catch(done.fail);
    });

    it('CURIEs are constant over multiple calls', done => {
        call('get', `http://localhost/api/list/item`).then((result: Hal.Resource) => {

            // Test _links
            expect(result).toBeDefined();
            expect(result._links).toBeDefined();

            // Test CURIEs
            testCuries(result, 0, 'list', '/api/list' + AutoDoc.path);

        }).then(() => call('get', `http://localhost/api/list/item`)).then((result: Hal.Resource) => {

            // Test _links
            expect(result).toBeDefined();
            expect(result._links).toBeDefined();

            // Test CURIEs
            testCuries(result, 0, 'list', '/api/list' + AutoDoc.path);

        }).then(done).catch(done.fail);
    });

    it('Automatic documentation works as expected', done => {
        call('get', `http://localhost/api/list/docs/list/item`).then((result: string) => {

            // Test basic automatic documentation
            expect(result.replace(/&#x2F;/g, '/')).toBe(`<h1>/api/list/item</h1><h2>GET</h2><p>${AutoDoc.description}</p>`);

        }).then(() => call('get', `http://localhost/api/list/docs/list/list`)).then((result: any) => {

            // Test lazy automatic documentation
            expect(result.replace(/&#x2F;/g, '/')).toBe(`<h1>/api/list/list</h1><h2>GET</h2><p>${AutoDoc.lazy}</p>`);

        }).then(() => call('get', `http://localhost/api/list/docs/list/${AutoDoc.fallback.rel}`)).then((result: any) => {

            // Test fallback automatic documentation
            expect(result.replace(/&#x2F;/g, '/')).toBe(`<h1>${AutoDoc.fallback.href}</h1><h2>${AutoDoc.fallback.verb}</h2><p>${AutoDoc.fallback.description}</p>`);

        }).then(() => call('get', `http://localhost/api/list/docs/list/invalid`)).then((result: any) => {

            // Test invalid automatic documentation
            expect(result).toBe('Not Found');

        }).then(done).catch(done.fail);
    });

    it('Filter decorators work as expected', done => {
        call('get', 'http://localhost/api/test/filter?filter=true').then((result: any) => {

            expect((result as any).value).toBe('first');

            expect(response.locals.order[0]).toBe('class');
            expect(response.locals.order[1]).toBe('first');
            expect(response.locals.order[2]).toBeUndefined();

        }).then(() => call('get', 'http://localhost/api/test/filter?filter=false')).then((result: any) => {

            expect(result.value).toBe('second');

            expect(response.locals.order[0]).toBe('class');
            expect(response.locals.order[1]).toBe('first');
            expect(response.locals.order[2]).toBe('second');
            expect(response.locals.order[3]).toBeUndefined();

        }).then(done).catch(done.fail);
    });
});