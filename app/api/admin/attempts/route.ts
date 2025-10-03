import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function GET() {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    const db = client.db(DB_NAME)
    const collection = db.collection("login_attempts")

    const attempts = await collection.find({}).sort({ timestamp: -1 }).toArray()

    await client.close()

    return NextResponse.json({ attempts }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch login attempts" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    const db = client.db(DB_NAME)
    const collection = db.collection("login_attempts")

    await collection.deleteMany({})
    await client.close()

    return NextResponse.json({ message: "All login attempts deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to delete login attempts" }, { status: 500 })
  }
}
