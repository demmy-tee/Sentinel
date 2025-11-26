import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 1. Setup Groq Client
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 2. CORS Headers (Allows your Chrome Extension to talk to this Server)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 3. Handle "Pre-flight" checks (Browser security handshake)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// 4. The Main Logic
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress } = body;

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Address is required' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // --- STEP A: Fetch Code from PolygonScan ---
    const polygonUrl = `https://api.polygonscan.com/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.POLYGONSCAN_API_KEY}`;
    const polygonRes = await fetch(polygonUrl);
    const polygonData = await polygonRes.json();

    // Check if contract is verified
    if (polygonData.message !== 'OK' || !polygonData.result[0].SourceCode) {
      return NextResponse.json({ 
        riskScore: 100, 
        riskLevel: 'Unknown', 
        summary: "Contract source code is NOT verified on PolygonScan. We cannot read the code, which is a high risk factor.",
        keyIssues: ["Unverified Code", "Potential Hidden Malicious Logic"]
      }, { headers: corsHeaders });
    }

    const sourceCode = polygonData.result[0].SourceCode;

    // --- STEP B: Ask Groq (AI) to Audit ---
    const systemPrompt = `
      You are an expert Smart Contract Auditor. Analyze the Solidity code provided.
      Focus on: Re-entrancy, Ownership Abuse, Honeypots, and Unlimited Approvals.
      
      Return valid JSON ONLY with this exact structure:
      {
        "riskScore": (number 0-100),
        "riskLevel": "Low" | "Medium" | "High",
        "summary": "A short, non-technical explanation.",
        "keyIssues": ["Short bullet point 1", "Short bullet point 2"]
      }
    `;

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this code: \n\n ${sourceCode.substring(0, 20000)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");

    // --- STEP C: Return Result with CORS Headers ---
    return NextResponse.json(analysis, { headers: corsHeaders });

  } catch (error) {
    console.error("Audit Error:", error);
    return NextResponse.json(
      { error: 'Audit failed' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}