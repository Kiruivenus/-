import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DB_NAME || "facebook_clone"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 })
    }

    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    const db = client.db(DB_NAME)
    const collection = db.collection("login_attempts")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    await client.close()

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Login attempt not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Login attempt deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to delete login attempt" }, { status: 500 })
  }
}
