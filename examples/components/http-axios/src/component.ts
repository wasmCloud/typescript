import axios from "axios";

export const run = {
  async run() {
    const resp = await axios.get(
      "https://jsonplaceholder.typicode.com/todos/1",
    );
    console.log(JSON.stringify(resp));
  },
};

export const invoke = {
  async call() {
    return await run.run();
  },
};
