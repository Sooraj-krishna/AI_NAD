import { Client } from "@gradio/client";
const client = await Client.connect("Qwen/Qwen3-Coder-WebDev");
const apiInfo = await client.view_api();
console.dir(apiInfo, {depth: null});
