
async function discoverModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env.local");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error("API Error:", JSON.stringify(data.error, null, 2));
    } else {
      console.log("Available Models:");
      data.models?.forEach((m: any) => console.log(` - ${m.name} (${m.supportedGenerationMethods.join(", ")})`));
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

discoverModels();
