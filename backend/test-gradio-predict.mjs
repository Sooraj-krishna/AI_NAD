import { Client } from "@gradio/client";
const client = await Client.connect("Qwen/Qwen3-Coder-WebDev");
try {
  const result = await client.predict("/chat", ["Hello", []]);
  console.log("/chat SUCCESS:", JSON.stringify(result.data, null, 2));
} catch(e) {
  console.log("/chat ERROR:", e.message);
  try {
     const result2 = await client.predict("/predict", ["Hello"]);
     console.log("/predict SUCCESS:", JSON.stringify(result2.data, null, 2));
  } catch(e2) {
     console.log("/predict ERROR:", e2.message);
  }
}
