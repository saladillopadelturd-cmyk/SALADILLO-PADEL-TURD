import OpenAI from "openai";

const freellmapi = new OpenAI({
  baseURL: process.env.FREELLMAPI_BASE_URL || "http://127.0.0.1:31415/v1",
  apiKey: process.env.FREELLMAPI_API_KEY || "",
});

export default freellmapi;
