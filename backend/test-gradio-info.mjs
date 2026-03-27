import { Client } from "@gradio/client";
const client = await Client.connect("Qwen/Qwen3-Coder-WebDev");
console.log(JSON.stringify(client.config.dependencies.map((d, i) => ({ id: i, endpoints: d.targets, inputs: d.inputs, outputs: d.outputs })), null, 2));
