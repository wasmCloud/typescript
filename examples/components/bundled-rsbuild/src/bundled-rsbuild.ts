import csv from 'csvtojson';
import { JSONPath } from 'jsonpath-plus';
import * as R from 'remeda';
import { InputData } from 'wasmcloud:hello/data-utils';

async function calculateScore(data: InputData): Promise<number> {
  let json;
  if (data.tag === 'csv') {
    json = await csv().fromString(data.val);
  } else if (data.tag === 'json') {
    json = JSON.parse(data.val);
  }

  const scoresData: unknown[] = JSONPath({
    path: '$[*].score',
    json,
  });

  const total = R.piped(
    R.map((x: unknown) => parseInt(x as string, 10)),
    R.reduce((acc, x: number) => acc + x, 0),
  )(scoresData);

  return total;
}

export const dataUtils = {
  calculateScore,
};
