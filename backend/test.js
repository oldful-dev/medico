require("dotenv").config();
const vision = require("@google-cloud/vision");

const client = new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function detectText() {
    const [result] = await client.textDetection("./test.jpg");

    const text = result.textAnnotations[0]?.description;

    console.log("Detected text:");
    console.log(text);
}

detectText();