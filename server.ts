import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy SDK Initialization helpers
let razorpayClient: Razorpay | null = null;
let dynamoClient: DynamoDBDocumentClient | null = null;

function getRazorpay() {
  if (!razorpayClient) {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.warn("Razorpay credentials missing. Payment creation will fail.");
      return null;
    }
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayClient;
}

function getDynamoDB() {
  if (!dynamoClient) {
    const region = process.env.AWS_REGION || "us-east-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.warn("AWS credentials missing. Data persistence to AWS will fail.");
      return null;
    }

    const client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    dynamoClient = DynamoDBDocumentClient.from(client);
  }
  return dynamoClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Create Razorpay Order
  app.post("/api/payment/order", async (req, res) => {
    try {
      const rzp = getRazorpay();
      if (!rzp) {
        return res.status(500).json({ error: "Razorpay not configured" });
      }

      const { amount, currency = "INR" } = req.body;
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency,
        receipt: `receipt_${Date.now()}`,
      };

      const order = await rzp.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay order error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Save Order & User Details to AWS DynamoDB
  app.post("/api/orders", async (req, res) => {
    try {
      const db = getDynamoDB();
      const tableName = process.env.DYNAMODB_TABLE_NAME || "VeggiesOrders";

      if (!db) {
        return res.status(500).json({ error: "AWS DynamoDB not configured" });
      }

      const { name, phone, orderId, paymentId, items, totalAmount } = req.body;

      // Backend security: Validate 10-digit phone number
      if (!phone || !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ error: "Invalid phone number. Must be exactly 10 digits." });
      }

      const command = new PutCommand({
        TableName: tableName,
        Item: {
          orderId: orderId || `order_${Date.now()}`,
          name,
          phone,
          paymentId,
          items,
          totalAmount,
          createdAt: new Date().toISOString(),
        },
      });

      await db.send(command);
      res.json({ success: true, message: "Order saved to cloud" });
    } catch (error: any) {
      console.error("DynamoDB save error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Fetch all orders for Admin Dashboard
  app.get("/api/admin/orders", async (req, res) => {
    try {
      const db = getDynamoDB();
      const tableName = process.env.DYNAMODB_TABLE_NAME || "VeggiesOrders";

      if (!db) {
        return res.status(500).json({ error: "AWS DynamoDB not configured" });
      }

      const command = new ScanCommand({
        TableName: tableName,
      });

      const response = await db.send(command);
      res.json(response.Items || []);
    } catch (error: any) {
      console.error("DynamoDB scan error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist folder not found. Make sure to build the app.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
