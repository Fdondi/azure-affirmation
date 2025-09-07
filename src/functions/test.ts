import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { VERSION } from "./shared/version";
import { buildCorsHeaders } from "./shared/cors";

export async function testFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Test function processed a request.');

    const origin = (request.headers as any).get ? (request.headers as any).get('origin') : (request.headers as any)['origin'];
    return {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            ...buildCorsHeaders(origin, false, ["Content-Type"])
        },
        jsonBody: { 
            message: "Hello from Static Web Apps integrated function!",
            timestamp: new Date().toISOString(),
            version: VERSION
        }
    };
}

app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: testFunction
});
