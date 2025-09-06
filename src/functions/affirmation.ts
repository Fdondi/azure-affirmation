import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomInt } from "crypto";
import { MongoClient } from "mongodb";
import { VERSION } from "./shared/version";

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
        timestamp: new Date().toISOString(),
        version: VERSION
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
    // Check authentication - Azure Static Web Apps injects user info in headers
    const clientPrincipal = req.headers['x-ms-client-principal'];
    
    if (!clientPrincipal) {
        return {
            status: 401,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            jsonBody: { error: "Unauthorized - Please log in", version: VERSION }
        };
    }

    // Decode the base64 encoded client principal
    let user;
    try {
        const decoded = Buffer.from(clientPrincipal, 'base64').toString();
        user = JSON.parse(decoded);
        ctx.log('Authenticated user:', user.userDetails);
    } catch (error) {
        ctx.log('Error parsing client principal:', error);
        return {
            status: 401,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            jsonBody: { error: "Invalid authentication", version: VERSION }
        };
    }

    const dbName = tryGetEnvVar('DB_NAME');
    const collectionName = tryGetEnvVar('COLLECTION_NAME');

    if (!dbName || !collectionName) {
        return { 
            status: 500, 
            jsonBody: { error: "Missing required environment variables", "db": dbName, "collection": collectionName, "version": VERSION } 
        };
    }

    try {
        await ensureConn();
        
        const db = client.db(dbName);
        const col = db.collection(collectionName);
        const n = await col.estimatedDocumentCount();
        const k = randomInt(0, n);
        const [doc] = await col.aggregate([{ $skip: k }, { $limit: 1 }]).toArray();

        if (!doc) {
            return { 
                status: 404, 
                jsonBody: { error: "No lines found", "db": dbName, "collection": collectionName, "version": VERSION } 
            };
        }

        return { 
            status: 200, 
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            jsonBody: { line: doc.text, version: VERSION } 
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
            jsonBody: { error: "Internal server error: " + error, "db": dbName, "collection": collectionName, "version": VERSION }
        };
    }
}

app.http("getRandomLine", { methods: ["GET", "POST"], authLevel: "anonymous", handler: getRandomLine });
