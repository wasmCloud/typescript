import { InputData } from 'wasmcloud:hello/data-utils';
import { XMLParser } from 'fast-xml-parser';
import * as R from 'remeda';

interface Item {
  title: string;
  score: number;
}

async function calculateScore(data: InputData): Promise<number> {
  let json: Item[] = [];
  if (data.tag === 'json') {
    json = JSON.parse(data.val);
  } else if (data.tag === 'xml') {
    const parser = new XMLParser({
      ignoreAttributes: true,
      ignoreDeclaration: true,
      // Parse <item> as a list even when there is only one
      isArray: (name) => name === 'item',
    });
    json = parser.parse(data.val)['item'] ?? [];
  }

  return R.pipe(
    json,
    R.filter((x) => x.title === 'Hello'),
    R.sumBy((x) => Number(x.score)),
  );
}

export const dataUtils = {
  calculateScore,
};
