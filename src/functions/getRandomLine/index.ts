import { randomInt } from "crypto";
import { MongoClient } from "mongodb";

const VERSION = "1.0.1";

function tryGetEnvVar(name: string): string | null {
    const value = process.env[name];
    if (!value) return null;
    return value;
}

const mongoUri = tryGetEnvVar('MONGODB_URI');
const client = mongoUri ? new MongoClient(mongoUri) : null;
let connected: Promise<void> | null = null;
async function ensureConn() {
  if (!mongoUri || !client) throw new Error('Missing required environment variable: MONGODB_URI');
  if (!connected) connected = client.connect().then(() => undefined);
  return connected;
}

const httpTrigger = async function (context: any, req: any): Promise<void> {
    const dbName = tryGetEnvVar('DB_NAME');
    const collectionName = tryGetEnvVar('COLLECTION_NAME');

    if (!dbName || !collectionName) {
        context.res = {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: { error: "Missing required environment variables", "db": dbName, "collection": collectionName, "version": VERSION }
        };
        return;
    }

    try {
        await ensureConn();
        
        const db = client.db(dbName);
        const col = db.collection(collectionName);
        const n = await col.estimatedDocumentCount();
        const k = randomInt(0, n);
        const [doc] = await col.aggregate([{ $skip: k }, { $limit: 1 }]).toArray();

        if (!doc) {
            context.res = {
                status: 404,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: { error: "No lines found", "db": dbName, "collection": collectionName, "version": VERSION }
            };
            return;
        }

        context.res = {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: { line: doc.text, version: VERSION }
        };
    } catch (error) {
        context.log('Error fetching random affirmation:', error);
        context.res = {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: { error: "Internal server error: " + error, "db": dbName, "collection": collectionName, "version": VERSION }
        };
    }
};

export default httpTrigger;
