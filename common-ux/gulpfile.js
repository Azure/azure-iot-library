"use strict";
let gulp = require('gulp');
let ts = require('gulp-typescript');
let merge = require('merge2');
let webpack = require('webpack');
let replace = require('gulp-replace');
let path = require('path');
let uglify = require('gulp-uglify');
let rename = require('gulp-rename');
let modify = require('gulp-modify');
let concat = require('gulp-concat');
let sourcemaps = require('gulp-sourcemaps');
let remap = require('remap-istanbul/lib/gulpRemapIstanbul');
let opener = require('opener');
let rimraf = require('rimraf');
let tsconfig = require('./tsconfig');
let packageInfo = require('./package.json');
let webpackConfig = require('./webpack.config.js');
let glob = require('glob');
let fs = require('fs');
let root = path.join(__dirname, 'components');

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
gulp.task('apply:copyright:components', done => glob('components/**/*.ts', applyCopyright(done)));
gulp.task('apply:copyright:test', done => glob('test/**/*.js', applyCopyright(done)));
gulp.task('apply:copyright', ['apply:copyright:components', 'apply:copyright:test']);

// Clean dest folder
gulp.task('clean-test', () => {
    rimraf.sync('dest');
});

// Clean client.js
gulp.task('clean-bundle', () => {
    rimraf.sync('client.js');
});

// Builds and bundles the source code - excludes the test files
gulp.task('build-bundle', ['clean-bundle'], () => {
    let tsStream = gulp.src('components/**/!(*spec).ts')
        .pipe(sourcemaps.init())
        .pipe(ts(tsconfig.compilerOptions));

    return merge([
        tsStream.dts,
        tsStream.js
            .pipe(modify({
                fileModifier: function (file, contents) {
                    let filePath = file.path
                        .replace(root, '')
                        .replace(/\\/gi, '/') // npm expects this kind of slash
                        .replace('.js', '');
                    let moduleName = packageInfo.name + filePath;
                    return contents.replace("System.register(", `System.register("${moduleName}", `);
                }
            }))
        // fix requires so webpack works
            .pipe(replace(/require\((['"])([^'"]*)\1\)/gi, "require(\"./components/$2\")"))
            .pipe(concat('unpacked.js'))
            .pipe(sourcemaps.write('.'))
    ])
        .pipe(gulp.dest('.'));
});

// Builds source and test code without bundling - this task is required for testing. 
// Karma can import test files not modules 
gulp.task('build-test', ['clean-test'], () => {
    let tsStream = gulp.src(['components/**/*.ts'])
        .pipe(sourcemaps.init())
        .pipe(ts(tsconfig.compilerOptions));
    tsStream.js
        .pipe(sourcemaps.write('.', { includeContent: false }))
        .pipe(gulp.dest('dest'));

    return merge([
        tsStream.dts,
        tsStream.js
    ])
        .pipe(gulp.dest('dest'));
});

gulp.task('run-test', ['build-test'], (done) => {

    var karma = require('karma').Server;
    karma.start({
        configFile: path.join(__dirname, './karma.conf.js')
    },
        (exitCode) => {
            if (exitCode) {
                console.log("\n*****************************");
                console.log("*   FIX BROKEN UNIT TESTS   *");
                console.log("*****************************\n");
            }

            var remapAction = gulp.src('dest/coverage/coverage-final.json')
                .pipe(remap({
                    basePath: 'components',
                    reports: {
                        'json': 'dest/coverage/coverage.json',
                        'html': 'dest/coverage/html-report'
                    }
                }));
            remapAction.on('finish', done);
        });
});

gulp.task('test', ['run-test'], () => {
    opener(['chrome', __dirname + './dest/coverage/html-report/index.html']);
});

gulp.task('build', ['build-bundle', 'build-test'], callback => {
    webpack(webpackConfig, callback)
});
