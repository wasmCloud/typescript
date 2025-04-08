import { dataUtils } from "./dist/transpiled/bundled_rsbuild_s.js"

const CSV_DATA = "title,score\nHello,3\nWorld,7"
const JSON_DATA = JSON.stringify([{ title: "Hello", score: 5 }]);

console.log(dataUtils.calculateScore({ tag: "csv", val: CSV_DATA }) + dataUtils.calculateScore({ tag: "json", val: JSON_DATA }))
