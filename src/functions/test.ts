import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function testFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Test function processed a request.');

    return {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        jsonBody: { 
            message: "Hello from Static Web Apps integrated function!",
            timestamp: new Date().toISOString()
        }
    };
}

app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: testFunction
});
