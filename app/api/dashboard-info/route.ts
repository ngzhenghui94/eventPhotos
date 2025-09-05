import { NextResponse } from 'next/server';

export async function GET() {
	// Example response, replace with real dashboard info logic as needed
	return NextResponse.json({
		status: 'ok',
		message: 'Dashboard info endpoint is working.'
	});
}
