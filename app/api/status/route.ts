export async function GET(){
  const hasAi = !!(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || (globalThis as any).env?.OPENAI_API_KEY);
  return Response.json({ai: hasAi});
}

