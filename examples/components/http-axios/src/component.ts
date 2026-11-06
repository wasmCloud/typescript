import axios from 'axios';

/** Fetch the example todo, returning the response as JSON. */
async function fetchTodo(): Promise<string> {
  const resp = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  return JSON.stringify(resp);
}

export const run = {
  async run() {
    console.log(await fetchTodo());
  },
};

export const invoke = {
  async call(): Promise<string> {
    return await fetchTodo();
  },
};
