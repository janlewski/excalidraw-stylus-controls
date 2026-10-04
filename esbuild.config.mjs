import esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const context = await esbuild.context({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    target: "es2022",
    logLevel: "info",
    sourcemap: "inline",
    outfile: "main.js",
});

if (watch) {
    await context.watch();
} else {
    await context.rebuild();
    await context.dispose();
}
