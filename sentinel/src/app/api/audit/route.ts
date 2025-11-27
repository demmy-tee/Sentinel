import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 1. Setup Groq Client
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

    // --- DEBUG LOG 1: Check if Keys exist ---
    if (!process.env.POLYGONSCAN_API_KEY) {
      console.error("CRITICAL: PolygonScan API Key is MISSING in .env.local");
      return NextResponse.json({ error: "Server Configuration Error: Missing API Key" }, { status: 500, headers: corsHeaders });
    }

    // --- STEP A: Fetch Code from PolygonScan ---
    const polygonUrl = `https://api.polygonscan.com/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.POLYGONSCAN_API_KEY}`;
    
    console.log(`Fetching from: ${polygonUrl}`); // <--- Print URL to console (Don't share this publicly)
    
    const polygonRes = await fetch(polygonUrl);
    const polygonData = await polygonRes.json();

    // --- DEBUG LOG 2: What did PolygonScan actually say? ---
    console.log("PolygonScan Response:", JSON.stringify(polygonData, null, 2));

    // HANDLE SPECIFIC API ERRORS
    if (polygonData.message === 'NOTOK') {
      if (polygonData.result === 'Invalid API Key') {
        return NextResponse.json({ 
          riskLevel: 'System Error', 
          summary: "INVALID API KEY. Please check your .env.local file. You might have extra spaces or quotes.",
          keyIssues: ["Developer Error: Fix API Key"]
        }, { headers: corsHeaders });
      }
      if (polygonData.result === 'Max rate limit reached') {
        return NextResponse.json({ 
          riskLevel: 'System Error', 
          summary: "System is busy (Rate Limit). Please wait 5 seconds and try again.",
          keyIssues: ["Rate Limit Exceeded"]
        }, { headers: corsHeaders });
      }
    }

    // HANDLE UNVERIFIED CODE
    if (!polygonData.result[0].SourceCode) {
      return NextResponse.json({ 
        riskScore: 100, 
        riskLevel: 'Unknown', 
        summary: "Contract source code is NOT verified on PolygonScan. We cannot read the code.",
        keyIssues: ["Unverified Code", "High Risk"]
      }, { headers: corsHeaders });
    }

    const sourceCode = polygonData.result[0].SourceCode;

    // --- STEP B: Ask Groq (AI) to Audit ---
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a smart contract auditor. Return JSON only: { riskScore: number, riskLevel: 'Low'|'Medium'|'High', summary: string, keyIssues: string[] }" },
        { role: "user", content: `Analyze this code: \n\n ${sourceCode.substring(0, 15000)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(analysis, { headers: corsHeaders });

  } catch (error) {
    console.error("Audit Error Full Trace:", error);
    return NextResponse.json(
      { error: 'Audit failed', details: String(error) }, 
      { status: 500, headers: corsHeaders }
    );
  }
}