
// Teams feature removed
export async function GET() {
	return Response.json({ error: 'Teams feature removed.' }, { status: 404 });
}
