import { Client } from "@gradio/client";
const client = await Client.connect("Qwen/Qwen3-Coder-WebDev");
try {
  const result = await client.predict("/chat", ["Hello", []]);
  console.log(JSON.stringify(result.data, null, 2));
} catch (e) {
  console.error("Error with /chat:", e.message);
}
