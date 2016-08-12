# Roadmap

As the first stable version of the configuration library (1.0.0-rc.6) has been released and is being used, let's take a quick look at the short-term future of the library.

## Necessary updates

### Log Mongo connection error messages
Right now, there is just a catch-all log of "Waiting...". This needs to be fleshed out to provide debugging information.
- [ ] Default to logging a waiting message with the associated error
- [ ] Options to more finely control error message options

## Nice to haves

### Crisper interactions
- [ ] Validate all passed Mongo URI's with [mongodb-uri][mongo-validator-url]
- [ ] Option to use a different keyname for MONGO_URI
- [ ] Option to not use/initialize certain providers (_e.g._ `mongo` provider)

### Code cleanup
The source code style can be cleaned up a bit.

### README updates
- [ ] Explicit API documentation
- [ ] Describe concept of "safe navigation" using arrays of config keys



[mongo-validator-url]: https://www.npmjs.com/package/mongodb-uri
