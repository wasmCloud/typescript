/** @module Interface wasmcloud:hello/csv-utils **/
export function calculateScore(data: InputData): number;
export type InputData = InputDataCsv | InputDataJson;
export interface InputDataCsv {
  tag: 'csv',
  val: string,
}
export interface InputDataJson {
  tag: 'json',
  val: string,
}
