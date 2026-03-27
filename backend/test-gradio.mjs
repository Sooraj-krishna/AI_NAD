import { Client } from "@gradio/client";
const client = await Client.connect("Qwen/Qwen3-Coder-WebDev");
const result = await client.predict("/lambda", ["Hello"]);
console.dir(result.data, {depth: null});
