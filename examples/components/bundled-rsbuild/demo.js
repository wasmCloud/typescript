import { csvUtils } from "./dist/transpiled/http_bundling_s.js"

const DATA = "title,score\nHello,5\nWorld,10"

console.log(csvUtils.calculateScore(DATA))
