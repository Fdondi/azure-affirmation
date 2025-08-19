import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { MongoClient } from "mongodb";

export async function testDate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request.');

    // For now, always return "Ok" as requested
    const responseMessage = {
        message: "Ok",
        timestamp: new Date().toISOString()
    };

    return {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        jsonBody: responseMessage
    };
}

app.http('testDate', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: testDate
});



const client = new MongoClient(process.env.MONGODB_URI!);
let connected: Promise<void> | null = null;
async function ensureConn() {
  if (!connected) connected = client.connect().then(() => undefined);
  return connected;
}

export async function getRandomLine(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    await ensureConn();
    const db = client.db(process.env.DB_NAME);
    const col = db.collection(process.env.COLLECTION_NAME);

    const [doc] = await col.aggregate([{ $sample: { size: 1 } }]).toArray();
    if (!doc) return { status: 404, jsonBody: { error: "No lines found" } };

    return { 
      status: 200, 
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      jsonBody: { line: doc.text, id: doc._id } 
    };
  } catch (error) {
    ctx.error('Error fetching random affirmation:', error);
    return { 
      status: 500, 
      jsonBody: { error: "Internal server error" } 
    };
  }
}

app.http("getRandomLine", { methods: ["GET", "POST"], authLevel: "function", handler: getRandomLine });
