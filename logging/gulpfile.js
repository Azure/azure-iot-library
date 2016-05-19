"use strict";
let gulp = require('gulp');
let ts = require('gulp-typescript');
let merge = require('merge2');
let replace = require('gulp-replace');
let path = require('path');
let modify = require('gulp-modify');
let concat = require('gulp-concat');
let rename = require('gulp-rename');
let sourcemaps = require('gulp-sourcemaps');
let filter = require('gulp-filter');

let tsconfig = require('./tsconfig');
let packageInfo = require('./package');
let istanbul = require('gulp-istanbul');
let jasmine = require('gulp-jasmine');
let remap = require('remap-istanbul/lib/gulpRemapIstanbul');
let opener = require('opener');
let config = {
    clientIndexName: 'clientIndex',
    serverIndexName: 'serverIndex'
};
let glob = require('glob');
let fs = require('fs');

let copyrightNotice = `/* Copyright (c) Microsoft Corporation. All Rights Reserved. */

`;

// Apply copyright to files
let applyCopyright = (done) => (err, files) => {
    files.forEach(function (file) {
        console.log('applying copyright to ' + file);
        var content = fs.readFileSync(file, 'utf8');
        content = content.replace(/^\s*\/\*(\S|\n|.)*?\*\/\s*/gi, '');
        content = copyrightNotice + content;
        fs.writeFileSync(file, content, 'utf8');
    });
    
    done();
}

// apply copyright to our code
gulp.task('apply:copyright', done => glob('src/**/*.ts', applyCopyright(done)));


gulp.task('bundle:client:ts', () => {
    let tsOptions = {
        'compilerOptions': tsconfig.compilerOptions
    };

    tsOptions.compilerOptions.module = 'system';

    let tsStream = gulp.src(['./src/client/**/*.ts', './src/common/**/*.ts', './src/typings/tsd.d.ts', `./src/${config.clientIndexName}.ts`], { base: './src' })
        .pipe(sourcemaps.init())
        .pipe(ts(tsOptions.compilerOptions));


    let root = __dirname + path.sep;

    let specFilter = filter(file => !file.path.includes('.spec.js'), { restore: true });

    return merge([
        tsStream.dts
            .pipe(rename(function (parsedPath) {
                // Rename clientIndex.d.ts to index.d.ts so that it is picked up
                // correctly by TypeScript
                if (parsedPath.basename === `${config.clientIndexName}.d`) {
                    parsedPath.basename = 'index.d';
                }
            })),
        tsStream.js
            .pipe(rename(function (parsedPath) {
                // Rename clientIndex.js to index.js so that it can be imported
                // using the name of the directory above it
                if (parsedPath.basename === config.clientIndexName) {
                    parsedPath.basename = 'index';
                }
            }))
            .pipe(modify({
                fileModifier: function (file, contents) {
                    let filePath = file.path
                        .replace(root, '')
                        .replace('\src', '')
                        .replace(/\\/gi, '/') // npm expects this kind of slash
                        .replace('.js', '');

                    if (filePath === '/index') {
                        // Special case for index.js: don't add the /index to the
                        // end of the module name so that we can import using the
                        // folder name.
                        //
                        // There is a side-effect of this approach. It changes
                        // the base folder against which the module's dependency
                        // paths are computed. We fix this by replacing the current
                        // directory for all dependencies to the module's path
                        // so that they are the correct absolute path.
                        let moduleName = packageInfo.name + '/client';
                        return contents
                            .replace("System.register(", `System.register("${moduleName}", `)
                            .replace(/\.\//g, `${moduleName}/`);
                    } else if (/\.spec$/.test(filePath)) {
                        let lines = contents.split('\n');
                        let moduleName = '/' + packageInfo.name + '/client' + filePath.substring(0, filePath.lastIndexOf('/'));
                        lines[0] = lines[0].replace(/[`'"](.+?)[`'"]/g, (match, file) => {
                            return match[0] + path.posix.join(moduleName, file) + match[match.length - 1];
                        });
                        return lines.join('\n');
                    } else {
                        // Set the absolute path of the import
                        let moduleName = packageInfo.name + '/client' + filePath;
                        return contents.replace("System.register(", `System.register("${moduleName}", `);
                    }
                }
            }))
            .pipe(specFilter)
            .pipe(concat('client.js'))
            .pipe(specFilter.restore)
            .pipe(sourcemaps.write('.', { includeContent: false }))
    ])
        .pipe(gulp.dest('./client'));
});

gulp.task('build:client:bunyan', ['bundle:client:ts'], () => {
    return gulp.src(['./client/client.js', './bunyan.js'])
        .pipe(concat('client.js'))
        .pipe(gulp.dest('./client/'));
});

gulp.task('build:client:ts', ['build:client:bunyan']);

gulp.task('build:server:ts', () => {
    let tsOptions = {
        'compilerOptions': tsconfig.compilerOptions
    };

    tsOptions.compilerOptions.module = 'commonjs';

    var tsStream = gulp.src(['./src/server/**/*.ts', './src/common/**/*.ts', './src/typings/tsd.d.ts', `./src/${config.serverIndexName}.ts`], { base: './src' })
        .pipe(sourcemaps.init())
        .pipe(ts(tsOptions.compilerOptions));

    tsStream.js
        .pipe(sourcemaps.write('.', { includeContent: false }))
        .pipe(gulp.dest('server'));

    return merge([
        tsStream.dts,
        tsStream.js
    ])
        .pipe(rename(function (parsedPath) {
            // Rename serverIndex.js and serverIndex.d.ts to index.js and index.d.ts
            // to en
            if (parsedPath.basename === config.serverIndexName) {
                parsedPath.basename = 'index';
            } else if (parsedPath.basename === `${config.serverIndexName}.d`) {
                parsedPath.basename = 'index.d';
            }
        }))
        .pipe(gulp.dest('./server'));
});

gulp.task('do-test:client', done => {
    var karma = require('karma').Server;
    karma.start({
        configFile: path.join(__dirname, './karma.conf.js')
    }, function (exitCode) {
        if (exitCode) {
            console.log("\n*****************************");
            console.log("*   FIX BROKEN UNIT TESTS   *");
            console.log("*****************************\n");
        }
        done();
    });
});

gulp.task('post-test:client', ['do-test:client'], () => {
    var remapAction = gulp.src('client/coverage/coverage-final.json')
        .pipe(remap({
            basePath: 'src',
            reports: {
                'json': 'client/coverage/coverage.json',
                'html': 'client/coverage/html-report'
            }
        }));
    remapAction.on('end', () => opener(__dirname + './client/coverage/html-report/index.html'));
    return remapAction;
});

gulp.task('test:client', ['do-test:client', 'post-test:client']);

gulp.task('pre-test:server', () => {
    return gulp.src(['server/**/!(*spec).js'])
        .pipe(istanbul())
        .pipe(istanbul.hookRequire())
});

gulp.task('do-test:server', ['pre-test:server'], () => {
    return gulp.src(['server/**/*.js'])
        .pipe(jasmine())
        .pipe(istanbul.writeReports({
            dir: 'server/coverage',
            reporters: ['json']
        }));
});

gulp.task('post-test:server', ['do-test:server'], () => {
    var remapAction = gulp.src('server/coverage/coverage-final.json')
        .pipe(remap({
            basePath: 'src',
            reports: {
                'json': 'server/coverage/coverage.json',
                'html': 'server/coverage/html-report'
            }
        }));

    remapAction.on('end', () => opener(__dirname + './server/coverage/html-report/index.html'));
    return remapAction;
});

gulp.task('test:server', ['pre-test:server', 'do-test:server', 'post-test:server']);
