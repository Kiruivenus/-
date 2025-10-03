import { NextResponse, type NextRequest } from "next/server"
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
    const collection = db.collection("settings")

    const settings = await collection.findOne({ key: "button_text" })

    await client.close()

    return NextResponse.json(
      {
        buttonText: settings?.value || "Войти",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch button text" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!MONGODB_URI) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const { buttonText } = await request.json()

    if (!buttonText || typeof buttonText !== "string") {
      return NextResponse.json({ error: "Invalid button text" }, { status: 400 })
    }

    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    const db = client.db(DB_NAME)
    const collection = db.collection("settings")

    await collection.updateOne(
      { key: "button_text" },
      {
        $set: {
          key: "button_text",
          value: buttonText,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    await client.close()

    return NextResponse.json(
      {
        message: "Button text updated successfully",
        buttonText,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to update button text" }, { status: 500 })
  }
}
