// Karma configuration
// Generated on Tue Apr 05 2016 17:24:58 GMT-0700 (Pacific Daylight Time)

module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: './',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['systemjs', 'jasmine'],

        // list of files / patterns to load in the browser
        files: [
        // Include test files
            'client/**/*.spec.js',
            
            // Serve SystemJS files to support the forced include below
            { pattern: 'node_modules/systemjs/**/*', included: false }
        ],

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['spec', 'coverage'],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'client/client.js': 'coverage'
        },

        coverageReporter: {
            type: 'json',
            dir: 'client/coverage',
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

        // Comment this out to debug Karma issues
        // logLevel: config.LOG_DEBUG,

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        //  logLevel: config.LOG_INFO,

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
            includeFiles: [
                'node_modules/systemjs/dist/system.src.js',
                'client/client.js'
            ]
        }
    });
};
