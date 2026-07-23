const esbuild = require("esbuild");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const server = require("../config/server");
const isProduction = server.isProduction;

module.exports = {
    // All .js files will be recognised as a language. The contents of these files will be processed as per the compile method
    outputFileExtension: "js",
    init: async function () {
        // Create the /assets/js directory on first build (prevents an error from
        // directory not existing). Using the promise-based mkdir and awaiting it
        // properly — the previous callback-style version returned before the
        // directory was guaranteed to exist, which caused an intermittent
        // ENOENT when compile() tried to write into it on a fresh build.
        await fsp.mkdir('public/assets/js', { recursive: true });
    },
    compile: async (content, inputPath) => {
        // If the file isn't from the assets directory, ignore it. It's probably a config file.
        if (!inputPath.includes("./src/assets/")) {
            return;
        }

        // Build JS with ESBuild. If production, minify, use sourcemaps, and target ES6
        const result = await esbuild.build({
            entryPoints: [inputPath],
            outdir: "public/assets/js",
            write: false,
            bundle: true,
            minify: isProduction,
            sourcemap: !isProduction,
            target: isProduction ? "es6" : "esnext",
        });

        return async () => {
            // Iterate over built files from ESBuild process
            for (const file of result.outputFiles) {
                // Defensive: make sure the destination directory exists before
                // every write, not just once at startup. Cheap (no-op if it's
                // already there) and removes the race condition entirely.
                await fsp.mkdir(path.dirname(file.path), { recursive: true });
                await fsp.writeFile(file.path, file.text);
            }

            return undefined;
        };
    }
};