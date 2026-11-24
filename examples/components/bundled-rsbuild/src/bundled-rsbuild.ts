import csv from 'csvtojson';
import { JSONPath } from 'jsonpath-plus';
import * as R from 'remeda';
import { InputData } from 'wasmcloud:hello/data-utils';

async function parse(data: InputData): Promise<unknown> {
  switch (data.tag) {
    case 'csv':
      return csv().fromString(data.val);
    case 'json':
      return JSON.parse(data.val);
    default:
      throw new Error(`unsupported input type '${(data as { tag: string }).tag}'`);
  }
}

async function calculateScore(data: InputData): Promise<number> {
  const json = await parse(data);

  const scoresData = JSONPath({
    path: '$[*].score',
    json: json as object,
  }) as unknown[];

  return R.piped(
    R.map((x: unknown) => parseInt(String(x), 10)),
    // A score that isn't a number is skipped rather than turning the total into NaN.
    R.filter((x: number) => !Number.isNaN(x)),
    R.reduce((acc, x: number) => acc + x, 0),
  )(scoresData);
}

export const dataUtils = {
  calculateScore,
};
