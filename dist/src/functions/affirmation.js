"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDate = testDate;
exports.getRandomLine = getRandomLine;
const functions_1 = require("@azure/functions");
const mongodb_1 = require("mongodb");
// Validate required environment variables
function getEnvVar(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function testDate(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
functions_1.app.http('testDate', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: testDate
});
function tryGetEnvVar(name) {
    const value = process.env[name];
    if (!value)
        return null;
    return value;
}
const mongoUri = tryGetEnvVar('MONGODB_URI');
if (!mongoUri) {
    throw new Error('Missing required environment variable: MONGODB_URI');
}
const client = new mongodb_1.MongoClient(mongoUri);
let connected = null;
function ensureConn() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!connected)
            connected = client.connect().then(() => undefined);
        return connected;
    });
}
function getRandomLine(req, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbName = tryGetEnvVar('DB_NAME');
        const collectionName = tryGetEnvVar('COLLECTION_NAME');
        if (!dbName || !collectionName) {
            return { status: 500, jsonBody: { error: "Missing required environment variables", "db": dbName, "collection": collectionName, "uri": mongoUri } };
        }
        const db = client.db(dbName);
        const col = db.collection(collectionName);
        try {
            yield ensureConn();
            const [doc] = yield col.aggregate([{ $sample: { size: 1 } }]).toArray();
            if (!doc)
                return { status: 404, jsonBody: { error: "No lines found", "db": dbName, "collection": collectionName, "uri": mongoUri } };
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
        }
        catch (error) {
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
    });
}
functions_1.app.http("getRandomLine", { methods: ["GET", "POST"], authLevel: "anonymous", handler: getRandomLine });
//# sourceMappingURL=affirmation.js.map