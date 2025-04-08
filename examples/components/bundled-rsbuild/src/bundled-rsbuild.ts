import csv from "csvtojson";
import jsonpath from "jsonpath";
import * as R from "remeda";
import { InputData } from "wasmcloud:hello/csvUtils";

async function calculateScore(data: InputData): Promise<number> {
  let json = {};
  if (data.tag === "csv") {
    json = await csv().fromString(data.val);
  } else if (data.tag === "json") {
    json = JSON.parse(data.val);
  }

  // Bit of a contrived example to use typescript dependencies
  const scoresData: string[] = jsonpath.query(json, "$[*].score");
  const total = R.piped(
    R.map((x: unknown) => parseInt(x as string)),
    R.reduce((acc, x: number) => acc + x, 0),
  )(scoresData);
  return total;
}

export const csvUtils = {
  calculateScore,
};
