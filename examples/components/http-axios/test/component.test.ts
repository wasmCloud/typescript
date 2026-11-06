import axios from 'axios';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { invoke, run } from '../src/component.js';

const todo = { userId: 1, id: 1, title: 'delectus aut autem', completed: false };

let fetch: ReturnType<typeof vi.fn>;
let log: ReturnType<typeof vi.spyOn>;
const originalAdapter = axios.defaults.adapter;

beforeEach(() => {
  // Inside the component there's no Node `http` module or XMLHttpRequest,
  // so axios sends requests through the host's `fetch`.
  axios.defaults.adapter = 'fetch';
  fetch = vi.fn(async () => Response.json(todo));
  vi.stubGlobal('fetch', fetch);
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function printed() {
  expect(log).toHaveBeenCalledTimes(1);
  return JSON.parse(log.mock.calls[0][0] as string);
}

test('run fetches the first todo', async () => {
  await run.run();

  expect(fetch).toHaveBeenCalledTimes(1);
  const request = fetch.mock.calls[0][0] as Request;
  expect(request.method).toBe('GET');
  expect(request.url).toBe('https://jsonplaceholder.typicode.com/todos/1');
});

test('run prints the whole axios response as JSON', async () => {
  await run.run();

  const response = printed();
  expect(response.status).toBe(200);
  expect(response.data).toEqual(todo);
  expect(response.config.url).toBe('https://jsonplaceholder.typicode.com/todos/1');
});

test('run rejects when the request fails', async () => {
  fetch.mockResolvedValueOnce(new Response('nope', { status: 500 }));

  await expect(run.run()).rejects.toThrow('Request failed with status code 500');
  expect(log).not.toHaveBeenCalled();
});

test('invoke.call resolves to the response as JSON', async () => {
  const resp = JSON.parse(await invoke.call());
  expect(resp.data).toEqual(todo);
  expect(log).not.toHaveBeenCalled();
});
