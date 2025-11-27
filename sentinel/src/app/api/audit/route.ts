import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress } = body;

    // 1. CHECK FOR NEW ETHERSCAN KEY
    if (!process.env.ETHERSCAN_API_KEY) {
      return NextResponse.json({ 
        riskLevel: 'System Error', 
        summary: "Missing ETHERSCAN_API_KEY. Please update .env.local with a V2 Unified Key.",
        keyIssues: ["Config Error"]
      }, { headers: corsHeaders });
    }

    // 2. FETCH FROM ETHERSCAN V2 (Unified Endpoint)
    // chainid=137 is Polygon Mainnet
    const v2Url = `https://api.etherscan.io/v2/api?chainid=137&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;
    
    console.log("Fetching V2 URL..."); 
    const response = await fetch(v2Url);
    const data = await response.json();

    // 3. HANDLE API ERRORS
    if (data.message === "NOTOK") {
      console.error("V2 API Error:", data.result);
      return NextResponse.json({ 
        riskLevel: 'System Error', 
        summary: `API Error: ${data.result}`, 
        keyIssues: ["Check .env.local", "Verify Etherscan Key"]
      }, { headers: corsHeaders });
    }

    // 4. CHECK VERIFICATION
    if (!data.result[0].SourceCode) {
      return NextResponse.json({ 
        riskScore: 100, 
        riskLevel: 'Unknown', 
        summary: "Contract source code is NOT verified. We cannot audit it.",
        keyIssues: ["Unverified Code", "High Risk"]
      }, { headers: corsHeaders });
    }

    const sourceCode = data.result[0].SourceCode;

    // 5. AI AUDIT
    const completion = await client.chat.completions.create({
      messages: [
      { role: "system", content: "You are a smart contract auditor. Analyze for security vulnerabilities. Return JSON only. schema: { riskScore: number (0-100, where 0 is SAFE and 100 is EXTREMELY DANGEROUS), riskLevel: 'Low'|'Medium'|'High', summary: string, keyIssues: string[] }" },
        { role: "user", content: `Analyze this code: \n\n ${sourceCode.substring(0, 20000)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(analysis, { headers: corsHeaders });

  } catch (error) {
    console.error("Audit Error:", error);
    return NextResponse.json({ error: 'Audit failed', details: String(error) }, { status: 500, headers: corsHeaders });
  }
}