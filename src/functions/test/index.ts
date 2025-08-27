const VERSION = "1.0.1";

const httpTrigger = async function (context: any, req: any): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    // For now, always return "Ok" as requested
    const responseMessage = {
        message: "Ok",
        timestamp: new Date().toISOString(),
        version: VERSION
    };

    context.res = {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        body: responseMessage
    };
};

export default httpTrigger;
