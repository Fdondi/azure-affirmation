import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { MongoClient } from "mongodb";

// Validate required environment variables
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

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


function tryGetEnvVar(name: string): string | null {
    const value = process.env[name];
    if (!value) return null;
    return value;
}

const mongoUri = tryGetEnvVar('MONGODB_URI');
if (!mongoUri) {
    throw new Error('Missing required environment variable: MONGODB_URI');
}
const client = new MongoClient(mongoUri);
let connected: Promise<void> | null = null;
async function ensureConn() {
  if (!connected) connected = client.connect().then(() => undefined);
  return connected;
}

export async function getRandomLine(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {

    const dbName = tryGetEnvVar('DB_NAME');
    const collectionName = tryGetEnvVar('COLLECTION_NAME');

    if (!dbName || !collectionName) {
        return { status: 500, jsonBody: { error: "Missing required environment variables", "db": dbName, "collection": collectionName, "uri": mongoUri } };
    }

    const db = client.db(dbName);
    const col = db.collection(collectionName);

    try {
    await ensureConn();
    
    const [doc] = await col.aggregate([{ $sample: { size: 1 } }]).toArray();
    if (!doc) return { status: 404, jsonBody: { error: "No lines found", "db": dbName, "collection": collectionName, "uri": mongoUri } };

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
    ctx.error('Error fetching random affirmation:', error, "data", {
      "db": dbName,
      "collection": collectionName,
      "uri": mongoUri,
      "error": error
    });
    return { 
      status: 500, 
      jsonBody: { error: "Internal server error: " + error, "db": dbName, "collection": collectionName, "uri": mongoUri } 
    };
  }
}

app.http("getRandomLine", { methods: ["GET", "POST"], authLevel: "anonymous", handler: getRandomLine });
