// Karma configuration
module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: './',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['systemjs', 'jasmine'],
        
        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage'],
   
        // list of files / patterns to load in the browser
        files: [
            'node_modules/reflect-metadata/Reflect.js',
            'node_modules/es5-shim/es5-shim.js',
            'node_modules/es6-shim/es6-shim.js',
            'node_modules/systemjs/dist/system-polyfills.js',
            'test/require-polyfill.js',
            'node_modules/zone.js/dist/zone.js',
            'dest/**/*.spec.js',
            { pattern: 'dest/**/!(*.spec).js', included: false },
            { pattern: 'node_modules/@angular/**/*.js', included: false },
            { pattern: 'node_modules/rxjs/**/*.js', included: false },
        ],
        
        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'dest/**/!(*.spec).js': 'coverage'
        },

        coverageReporter: {
            type: 'json',
            dir: 'dest/coverage',
            subdir: '.',
            file: 'coverage-final.json'
        },

        // uses karma-spec-reporter to make errors readable
        specReporter: {
            maxLogLines: 1,         // limit number of lines logged per test
            suppressErrorSummary: true,  // do not print error summary
            suppressFailed: false,  // do not print information about failed tests
            suppressPassed: false,  // do not print information about passed tests
            suppressSkipped: false,  // do not print information about skipped tests
            showSpecTiming: true // print the time elapsed for each spec
        },
                
        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        // logLevel: config.LOG_INFO,
         
        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        // To debug, use: browsers: ['Chrome'],
        browsers: ['PhantomJS'],
        browserNoActivityTimeout: 100000,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,

        systemjs: {
            config: {
                map: {
                    '@angular': 'node_modules/@angular',
                    rxjs: 'node_modules/rxjs',
                    crypto: '@empty',
                },
                packages: {
                    '@angular/core': {
                        main: 'index.js',
                        defaultExtension: 'js'
                    },
                    'rxjs': {
                        defaultExtension: 'js'
                    },
                    'dest': {
                        defaultExtension: 'js',
                        format: 'register'
                    }
                },
            }
        }
    });
};
