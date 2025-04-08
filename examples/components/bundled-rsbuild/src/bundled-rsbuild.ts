
import csv from "csvtojson";
import jsonpath from "jsonpath";
import * as R from "remeda";

async function calculateScore(data: string): Promise<number> {
  // Bit of a contrived example to use typescript dependencies
  const json = await csv().fromString(data);
  const scoresData: string[] = jsonpath.query(json, '$[*].score')
  const total = R.piped(
    R.map((x: unknown) => parseInt(x as string)),
    R.reduce((acc, x: number) => acc + x, 0)
  )(scoresData)
  return total
}

export const csvUtils = {
  calculateScore
}
