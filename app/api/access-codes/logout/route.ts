import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function POST(request: NextRequest) {
  try {
    const { deviceFingerprint } = await request.json()

    if (!deviceFingerprint) {
      return NextResponse.json({ error: "Device fingerprint is required" }, { status: 400 })
    }

    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("access_codes")

    // Clear the active device for this access code
    await collection.updateMany(
      { currentActiveDevice: deviceFingerprint },
      {
        $set: {
          currentActiveDevice: null,
          activeSince: null,
        },
      },
    )

    await client.close()

    return NextResponse.json({ message: "Logged out successfully" }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 })
  }
}
