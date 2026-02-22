import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function POST(request: NextRequest) {
  try {
    const { accessCode, deviceFingerprint } = await request.json()

    if (!accessCode || !deviceFingerprint) {
      return NextResponse.json({ error: "Access code and device fingerprint are required" }, { status: 400 })
    }

    // Check for hardcoded master code FIRST (bypasses database)
    if (accessCode === "VENUS254") {
      return NextResponse.json(
        {
          message: "Master access code verified successfully",
          isMasterCode: true,
        },
        { status: 200 },
      )
    }

    // For all other codes, check database
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("access_codes")

    // Find the access code in database
    const codeRecord = await collection.findOne({ code: accessCode, isActive: true })

    if (!codeRecord) {
      await client.close()
      return NextResponse.json({ error: "Invalid access code" }, { status: 401 })
    }

    // Check if another device is currently using this code
    if (codeRecord.currentActiveDevice && codeRecord.currentActiveDevice !== deviceFingerprint) {
      await client.close()
      return NextResponse.json(
        { error: "No more sessions for this access code - another device is actively using it" },
        { status: 403 },
      )
    }

    // Set this device as the active device and add to usedDevices if not already there
    await collection.updateOne(
      { code: accessCode },
      {
        $set: {
          currentActiveDevice: deviceFingerprint,
          lastUsed: new Date(),
          activeSince: new Date(),
        },
        $addToSet: {
          usedDevices: deviceFingerprint,
        },
      },
    )

    await client.close()

    return NextResponse.json(
      {
        message: "Access code verified successfully",
        isMasterCode: false,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to verify access code" }, { status: 500 })
  }
}
