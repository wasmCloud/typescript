/** @module Interface wasmcloud:hello/data-utils **/
export function calculateScore(data: InputData): number;
export type InputData = InputDataJson | InputDataXml;
export interface InputDataJson {
  tag: 'json',
  val: string,
}
export interface InputDataXml {
  tag: 'xml',
  val: string,
}
