# @azure-iot/hal

A decorator-based library for implementing HAL-compliant services.

## Development

Clone and run `npm install`.

## Installation

`npm install --save @azure-iot/hal`

## API `@azure-iot/hal/api`

### Class Decorators

#### `@provides(ns, [options])`
Associates a HAL namespace and documentation with this server class. It can be used multiple times; the first namespace provided will be treated as the default namespace for any non-namespaced rels used within this server.
* `ns` [string]: The namespace's name.
* `options` [provides.Options.Namespace] *(optional)*:
    * `href` [string]: The documentation link representing this namespace; this contains the placeholder 'rel' for the rels provided by the routes of this server, as per the HAL spec. It can accept either URI-template or Express syntax, though the latter is required for automated documentation. Default is '/docs/&lt;namespace&gt;/:rel'.
    * `auto` [boolean]: Indicates whether to automatically generate documentation from the `description` attributes, described below; default is false if `href` is specified, true otherwise.

#### `@middleware(handler, [options])`
Indicates Express-style middleware to use with this server; it can be used multiple times to add more than one middleware function per server.
* `handler` [express.RequestHandler | express.ErrorRequestHandler]: The Express-style middleware function.
* `options` [middleware.Options] *(optional)*:
    * `error` [boolean]: Indicates that this is error-handling middleware, meaning it is registered after the defined routes, rather than before; default is false.

### Method Decorators

#### `@route(method, path)`
Indicates that the following method provides an Express or HAL route handler.
* `method` [string | Method]: The HTTP method from the `Method` enum or as a string.
* `path` [string]: The route path for this handler.

#### `@provides(rel, [options])`
Indicates a rel this handler provides; it can be used multiple times, and omitting it will prevent HAL responses from automatically linking to this route's path.
* `rel` [string | LinkRelation]: The rel this route provides; this is either a string specifying a custom rel (which will automatically be prepended with this server's namespace, e.g. 'ns:rel' in the example below) or an instance of the LinkRelation enum, specifying one of the standard, non-namespaced rels.
* `options` [provides.Options.Rel] *(optional)*:
    * `discoverable` [boolean]: Indicates whether this handler should be included in the discoverability API; default is false.
    * `params` [any]: URI parameters to explicitly force for this rel. This allows, for example, a route with an optional parameter to have a separate rel explicitly for when that parameter is empty.
    * `id` [string]: The name of the ID parameter. This will fill out the 'name' in any links to this rel from the corresponding entry in the params object.
    * `title` [string]: The value to be placed in the 'title' parameter in any links to this rel.
    * `description` [string]: The description that will be used for this rel and this route in automatically-generated documentation.

#### `@middleware(handler)`
Indicates Express-style middleware to use with this route; it can be used multiple times to add more than one middleware function per route.
* `handler` [express.RequestHandler]: The Express-style middleware function.

#### `@hal(...rels, [options])`
Indicates that this method should return a HAL response; ommitting it will cause this handler to act as a normal Express handler rather than a HAL handler. It causes the response object passed to the handler to have additional functionality as specified by the `hal.Reponse` interface.
* `rels` [string | LinkRelation]: Any number of rels that should always be returned as links in the HAL response; these can consist of:
    * Standard rels from the LinkRelation enum, which refer to this server.
    * Non-namespaced custom rels, which refer to the default namespace of this server.
    * Namespaced custom rels, which refer to another server or a non-default namespace of this server.
* `options` [hal.Options] *(optional)*:
    * `self` [boolean]: Indicates whether this HAL response should include the standard 'self' rel; default is true for GET routes, false otherwise.

### Interfaces

#### `hal.Response`
The additional functionality added to the `express.Response` object by the `@hal` decorator. Calling the express `json` method will trigger the return of a HAL response. It provides the following methods:
* `link(rel, [overrides])`: Dynamically adds a link to the response. As per the `@hal` decorator, it will automatically determine the href of the associated rel, populating it with the params of this request.
    * `rel` [string | LinkRelation]: The rel to add, as per the arguments to the `@hal` decorator.
    * `overrides` [hal.Overrides] *(optional)*: Allows you to override the default behavior for the following:
        * `rel` [string | LinkRelation]: The HAL response will include the link under this rel, though the href will still be populated automatically as normal.
        * `href` [string]: The HAL response will use the provided href for this rel, rather than the server-provided one.
        * `params` [any]: The href will be populated using this params object, rather than the one from the request.
        * `server` [Object]: The server class used for non-namespaced and standard rels.
        * `array` [boolean]: The rel will be forced to be an array, even if it only contains one link.
        * `links` [Array&lt;string | LinkRelation&gt;]: The array of rels associated with this link. This corresponds to the array of rels provided to the `@hal` decorator for this link, plus the 'self' rel if it would typically be present, and is used for link embedding when necessary.
        * `id` [string]: The 'name' parameter for this link will be set to this member of the params object.
        * `title` [string]: The 'title' parameter for this link will be set to this value.
* `embed(rel, value, [overrides])`: Dynamically adds an embedded value to the response.
    * `rel` [string | LinkRelation]: The rel under which to add the embedded value. The value will automatically be given a 'self' link in accordance with this rel, unless it is overridden.
    * `value` [Object]: The JSON object to embed.
    * `overrides` [hal.Overrides] *(optional)*: Allows you to override the default behavior of the rel, as described above.
* `docs(ns, href)`: Manually adds documentation CURIEs to the response. Normally, these are populated automatically from the associated servers of the included rels; however, if this response includes rels that are not provided by servers in this service, this can be used to include the CURIEs manually.
    * `ns` [string]: The namespace of this documentation.
    * `href` [string]: The documentation link representing this namespace; as per HAL.

### Functions

#### `route(server)`
Returns the `express.Application` for the given server instance.
* `server` [Object]: The instance of the server class.

#### `hal.discovery`
An Express handler which provides links to all discoverable routes.

## Types `@azure-iot/hal/types`

#### `Method`
An enum shorthand for the most common HTTP methods.

#### `LinkRelation`
An enum representing the standard, well-defined link relations, as per [IANA](http://www.iana.org/assignments/link-relations/link-relations.xhtml).

#### `Hal.Resource`
An interface representing the form of a HAL reponse or embedded HAL object.

#### `Hal.Link`
An interface representing the form of a HAL link. 

## Example

```ts
import {route, middleware, hal, provides} from '@azure-iot/hal/api';
import {Method, LinkRelation, Hal} from '@azure-iot/hal/types';

@provides('ns', { href: '/docs/ns/:rel', auto: true })
@middleware(expressMiddlewareFunction)
class Server {

    @route(Method.GET, '/path')
    @provides('rel')
    @middleware(expressMiddlewareFunction)
    @hal('rel', 'altns:rel')
    RouteHandler(req: express.Request, response: express.Response & hal.Response, next: express.NextFunction) {
        response.link('altrel');
        response.embed('altrel', { value: 'value' });
        response.docs('altns', 'http://www.adatum.com/docs/{rel}');
        response.json(data);
    }
}

let app = express();
app.use('/api', route(new Server()));
app.get('/', hal.discovery);
```