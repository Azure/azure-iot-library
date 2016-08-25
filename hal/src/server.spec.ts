/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

import * as request from 'supertest';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as url from 'url';

import {route, middleware, hal, provides} from '../api';
import {Method, LinkRelation, Hal} from '../types';

// Create a class for testing decorator behavior
let TestAPIName = 'test';
let TestAPIDocs = 'http://www.contoso.com/docs/:rel';
let TestAPITemplate = 'http://www.contoso.com/docs/{rel}';
@provides(TestAPIName, { href: TestAPIDocs })
@middleware(function(req: express.Request, response: express.Response, next: express.NextFunction) {
    if (!response.locals.order) {
        response.locals.order = [];
    }

    response.locals.order.push('class');
    
    next();
})
@middleware(function(err: any, req: express.Request, response: express.Response, next: express.NextFunction) {
    if (!response.locals.order) {
        response.locals.order = [];
    }

    response.locals.order.push('error');
    
    next();
}, { error: true })
class TestAPI {

    @route(Method.GET, '/happy')
    @provides('happy', { discoverable: true })
    @middleware(function(req: express.Request, response: express.Response, next: express.NextFunction) {
        if (!response.locals.order) {
            response.locals.order = [];
        }

        response.locals.order.push('first');
        
        next();
    })
    @hal('mixed', 'middleware', 'NoHateoasBehavior', LinkRelation.Index, 'template', 'duplicate')
    HappCase(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        response.link('extra');
        response.link('override', {
            rel: LinkRelation.Alternate,
            array: true
        });
        response.link('custom', {
            href: 'http://www.contoso.com'
        });
        response.link('template', {
            params: { id: 'name' }
        });
        response.embed('extra', { value: 'test' });
        response.embed('custom', { value: 'test' }, { links: ['override'] });
        response.embed('parent', { value: 'parent' }).embed('child', { value: 'child' });
        
        response.json({
            simple: 'simple',
            complex: {
                value: 'value'
            }
        });
    };


    @hal('happy')
    @provides('mixed')
    @route(Method.POST, '/mixed')
    @middleware(function(req: express.Request, response: express.Response, next: express.NextFunction) {
        if (!response.locals.order) {
            response.locals.order = [];
        }

        response.locals.order.push('first');
        
        next();
    })
    MixedOrderDecorators(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        response.json({});
    };


    @hal('happy')
    @provides('middleware')
    @route(Method.PUT, '/middleware')
    @middleware(function first(req: express.Request, response: express.Response, next: express.NextFunction) {
        
        if (!response.locals.order) {
            response.locals.order = [];
        }

        response.locals.order.push('first');
        
        next();
    })
    @middleware(function second(req: express.Request, response: express.Response, next: express.NextFunction) {
       
        if (!response.locals.order) {
            response.locals.order = [];
        }

        response.locals.order.push('second');
        
        next();
    })
    MiddlewareExecutionOrder(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        throw new Error();
    };
    
    
    @route(Method.DELETE, '/NoHateoasBehavior')
    @provides()
    @middleware(function(req: express.Request, response: express.Response, next: express.NextFunction) {
        if (!response.locals.order) {
            response.locals.order = [];
        }

        response.locals.order.push('first');
        
        next();
    })
    NoHateoasBehavior(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/index')
    @provides(LinkRelation.Index)
    DefaultRel(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/extra')
    @provides('extra')
    @hal('happy')
    Extra(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/override')
    @provides('override')
    Override(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/template/:id')
    @provides('template', { id: 'id' })
    Template(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/duplicate')
    @provides('duplicate')
    DuplicateGet(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.PUT, '/duplicate')
    @provides('duplicate')
    DuplicatePut(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/distinct')
    @provides('duplicate')
    DuplicateDistinct(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
    
    @route(Method.GET, '/fallthrough/:id')
    @hal('template', { self: false })
    ParameterFallthrough(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        response.json({});
    }

    @route(Method.GET, '/child')
    @provides('child')
    @hal('alt:cross')
    Child(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        response.json({});
    };
};

let AltAPIName = 'alt';
let AltAPIDocs = 'http://www.adatum.com/docs/{rel}';
@provides(AltAPIName, { href: AltAPIDocs })
@provides('secondary')
class AltTestAPI {
    
    @route(Method.GET, '/cross')
    @provides('cross', { discoverable: true })
    @hal('test:happy')
    CrossClassRel(req: express.Request, response: express.Response, next: express.NextFunction) {
        response.json({});
    };
}

describe('HAL API Tests', () => {

    let testAPI: TestAPI;
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
        
        router = express();
        router.use('/test', route(new TestAPI()));
        router.use('/alt', route(new AltTestAPI()));

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
        call('delete', 'http://localhost/api/test/NoHateoasBehavior', done);
        
        expect(result).toBeDefined();
        expect(result._links).toBeFalsy();
        
        done();
    });
    
    
    it('Should return expected HAL result', done => {
        call('get', 'http://localhost/api/test/happy?test=true', done);

        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        
        // Test self link
        expect(single(result._links, 'self').href).toBe('/api/test/happy?test=true');
        
        // Test curies
        testCuries(result, 0, TestAPIName, TestAPITemplate);
        testCuries(result, 1, AltAPIName, AltAPIDocs);
        
        // Test standard links
        testStandardLink(result, TestAPIName, 'mixed');
        testStandardLink(result, TestAPIName, 'middleware');
        testStandardLink(result, TestAPIName, 'NoHateoasBehavior');
        
        // Test link-relation links

        expect(single(result._links, 'index').href).toBe('/api/test/index');
        
        // Test templated links
        let templates = array(result._links, `${TestAPIName}:template`);
        expect(templates.length).toBe(2);
        expect(templates[0].href).toBe('/api/test/template/{id}');
        expect(templates[0].templated).toBe(true);
        expect(templates[1].href).toBe('/api/test/template/name');
        expect(templates[1].name).toBe('name');
        
        // Test duplicate links
        let duplicates = array(result._links, `${TestAPIName}:duplicate`);
        expect(duplicates.length).toBe(2);
        expect(duplicates[0].href).toBe('/api/test/duplicate');
        expect(duplicates[1].href).toBe('/api/test/distinct');
        
        // Test added links
        testStandardLink(result, TestAPIName, 'extra');
        expect(result._links[`${TestAPIName}:override`]).toBeUndefined();
        expect(single(result._links, `${TestAPIName}:custom`).href).toBe('http://www.contoso.com');
        let alternates = array(result._links, 'alternate');
        expect(alternates.length).toBe(1);
        expect(alternates[0].href).toBe('/api/test/override');
        
        // Test embedded objects
        expect(result._embedded).toBeDefined();
        
        let extraEmbedded = single(result._embedded, `${TestAPIName}:extra`);
        expect(extraEmbedded).toBeDefined();
        expect(extraEmbedded['value']).toBe('test');
        expect(extraEmbedded._links).toBeDefined();
        expect(single(extraEmbedded._links, 'self').href).toBe('/api/test/extra');
        testStandardLink(extraEmbedded, TestAPIName, 'happy');
        
        let customEmbedded = single(result._embedded, `${TestAPIName}:custom`);
        expect(customEmbedded).toBeDefined();
        expect(customEmbedded['value']).toBe('test');
        expect(customEmbedded._links).toBeDefined();
        expect(customEmbedded._links['self']).toBeUndefined();
        testStandardLink(customEmbedded, TestAPIName, 'override');

        let parentEmbedded = single(result._embedded, `${TestAPIName}:parent`);
        expect(parentEmbedded).toBeDefined();
        expect(parentEmbedded['value']).toBe('parent');
        expect(parentEmbedded._links).toBeUndefined();
        expect(parentEmbedded._embedded).toBeDefined();

        let childEmbedded = single(parentEmbedded._embedded, `${TestAPIName}:child`);
        expect(childEmbedded).toBeDefined();
        expect(childEmbedded['value']).toBe('child');
        expect(childEmbedded._links).toBeDefined();
        expect(single(childEmbedded._links, 'self').href).toBe('/api/test/child');
        expect(childEmbedded._links['curies']).toBeUndefined();
        testStandardLink(childEmbedded, AltAPIName, 'cross');
 
        // Test content
        expect(result['simple']).toBe('simple');
        expect(result['complex']).toBeDefined();
        expect(result['complex'].value).toBe('value');

        done();
    });
    

    it('Cross-class rels should link properly', done => {
        call('get', 'http://localhost/api/alt/cross', done);
        
        // Test curies
        testCuries(result, 0, TestAPIName, TestAPITemplate);
     
        // Test link
        testStandardLink(result, TestAPIName, 'happy');
 
        done();
    });
    
    it('Discoverable routes should be discoverable', done => {
        call('get', 'http://localhost/api/', done);
        
        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        
        // Test curies
        testCuries(result, 0, TestAPIName, TestAPITemplate);
        testCuries(result, 1, AltAPIName, AltAPIDocs);
     
        // Test links
        testStandardLink(result, TestAPIName, 'happy');
        testStandardLink(result, AltAPIName, 'cross');
        
        done();
    });
    
    it('Parameters should fall through to subsequent links', done => {
        call('get', 'http://localhost/api/test/fallthrough/name', done);
        
        // Test _links
        expect(result).toBeDefined();
        expect(result._links).toBeDefined();
        expect(single(result._links, `${TestAPIName}:template`).href).toBe('/api/test/template/name');
        expect(result._links['self']).toBeUndefined();
 
        done();
    });
});