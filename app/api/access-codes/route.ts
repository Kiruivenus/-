import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function GET() {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("access_codes")

    const codes = await collection.find({}).sort({ createdAt: -1 }).toArray()

    await client.close()

    return NextResponse.json({ codes }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch access codes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const { accessCode, description } = await request.json()

    if (!accessCode || accessCode.trim().length === 0) {
      return NextResponse.json({ error: "Access code is required" }, { status: 400 })
    }

    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("access_codes")

    // Check if code already exists
    const existing = await collection.findOne({ code: accessCode })
    if (existing) {
      await client.close()
      return NextResponse.json({ error: "Access code already exists" }, { status: 400 })
    }

    // Insert new access code
    await collection.insertOne({
      code: accessCode,
      description: description || "",
      createdAt: new Date(),
      usedDevices: [],
      isActive: true,
    })

    await client.close()

    return NextResponse.json({ message: "Access code created successfully" }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to create access code" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Access code is required" }, { status: 400 })
    }

    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(DB_NAME)
    const collection = db.collection("access_codes")

    await collection.deleteOne({ code })

    await client.close()

    return NextResponse.json({ message: "Access code deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to delete access code" }, { status: 500 })
  }
}
