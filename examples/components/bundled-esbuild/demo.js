import { dataUtils } from "./dist/transpiled/bundled_esbuild_s.js"

const JSON_DATA = JSON.stringify([{ title: "Hello", score: 5 }, { title: "World", score: 7 }]);
const XML_DATA = "<item><title>Hello</title><score>3</score></item><item><title>World</title><score>7</score></item>";

const jsonScore = dataUtils.calculateScore({ tag: "json", val: JSON_DATA });
const xmlScore = dataUtils.calculateScore({ tag: "xml", val: XML_DATA });
console.log(jsonScore + xmlScore);
