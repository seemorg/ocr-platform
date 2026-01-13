import { NextRequest, NextResponse } from "next/server";

// Simple in-memory storage for development login URLs
const loginUrls = new Map<string, { url: string; timestamp: number }>();

export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    const { email, url } = await request.json();

    loginUrls.set(email.toLowerCase(), {
        url,
        timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const data = loginUrls.get(email.toLowerCase());

    if (!data) {
        return NextResponse.json({ url: null });
    }

    // Clear URLs older than 5 minutes
    if (Date.now() - data.timestamp > 5 * 60 * 1000) {
        loginUrls.delete(email.toLowerCase());
        return NextResponse.json({ url: null });
    }

    return NextResponse.json({ url: data.url });
}
