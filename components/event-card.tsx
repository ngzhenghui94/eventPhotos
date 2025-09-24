import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/category-icon';
import { Calendar, ExternalLink, Eye, Settings } from 'lucide-react';

type EventItem = import('@/lib/db/schema').Event & {
	photoCount: number;
	ownerName?: string | null;
	category?: string;
	role?: 'host' | 'organizer' | 'photographer' | 'customer' | null;
};

function formatDate(date: Date | string | null | undefined) {
	if (!date) return 'No date';
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function gradientClassFor(code?: string) {
	const gradients = [
		'from-orange-50 to-blue-100',
		'from-pink-50 to-yellow-100',
		'from-green-50 to-blue-50',
		'from-purple-50 to-orange-50',
		'from-amber-50 to-lime-100',
		'from-cyan-50 to-indigo-100',
		'from-red-50 to-pink-100',
		'from-teal-50 to-green-100',
		'from-gray-50 to-gray-100',
	];
	const key = (code || '').toString();
	if (!key) return gradients[0];
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		hash = (hash * 31 + key.charCodeAt(i)) % gradients.length;
	}
	return gradients[Math.abs(hash) % gradients.length];
}

export function EventCard({ event }: { event: EventItem }) {
	const isDemo = (event.name || '').toLowerCase() === 'demo event' || (event.eventCode || '').toUpperCase().includes('DEMO');
	const borderClass = isDemo ? 'border-orange-200' : 'border-gray-200';
	const gradientClass = isDemo ? 'from-orange-50 via-white to-blue-100' : gradientClassFor(event.eventCode);

		return (
			<Card className={`group border ${borderClass} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-xl overflow-hidden h-[360px] md:h-[420px] bg-gradient-to-br ${gradientClass}`}> 
				<CardContent className="p-4 flex-1 flex flex-col">
				{/* Header */}
				<div className="flex items-start gap-2">
					<div className="shrink-0 mt-1"><CategoryIcon category={event.category} /></div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-gray-900 truncate">
								{event.name || 'Untitled Event'}
							</h3>
							{event.category && (
								<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/70 backdrop-blur text-gray-700 border border-gray-200 text-[11px]">
									{event.category}
								</span>
							)}
														{event.role && (
																<span
																	className={(() => {
																		const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border';
																		switch (event.role) {
																			case 'host':
																				return `${base} bg-orange-50 text-orange-700 border-orange-200`;
																			case 'organizer':
																				return `${base} bg-green-50 text-green-700 border-green-200`;
																			case 'photographer':
																				return `${base} bg-purple-50 text-purple-700 border-purple-200`;
																			case 'customer':
																				return `${base} bg-gray-50 text-gray-700 border-gray-200`;
																			default:
																				return `${base} bg-gray-50 text-gray-700 border-gray-200`;
																		}
																	})()}
																>
																	{event.role.charAt(0).toUpperCase() + event.role.slice(1)}
																</span>
														)}
						</div>

						{/* Meta chips */}
									<div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
										<span className={`inline-flex items-center px-2.5 py-1 rounded-full border ${event.isPublic ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
								{event.isPublic ? 'Public' : 'Private'}
							</span>
										<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
								Guest Code: {event.eventCode}
							</span>
									{event.accessCode ? (
										<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200" title="Access Code">
											Access Code: {event.accessCode}
										</span>
									) : null}
										<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
								<Calendar className="h-3.5 w-3.5 mr-1" />
								{formatDate((event as any).date)}
							</span>
										<span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
								{event.photoCount} photo{event.photoCount === 1 ? '' : 's'}
							</span>
						</div>

						{/* Optional details */}
									{event.location && (
							<div className="mt-3 flex items-center text-xs text-gray-700">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-gray-500 flex-shrink-0"><path d="M21 10c0 6.075-9 13-9 13S3 16.075 3 10a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
								<span className="truncate" title={event.location}>{event.location}</span>
							</div>
						)}
						{event.description && (
							<p className="mt-2 text-xs text-gray-700 line-clamp-2">
								{event.description}
							</p>
						)}
									{/* Access chip (separate row as in design) */}
									<div className="mt-2">
										<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-xs">
											Access: {event.isPublic ? 'Public' : 'Private'}
										</span>
									</div>
					</div>
				</div>

				{/* Actions */}
									<div className="mt-auto grid grid-cols-3 gap-2 pt-2">
					<Link href={`/dashboard/events/${event.id}`} className="col-span-1">
									<Button size="xs" variant="secondary" className="w-full flex items-center gap-1 rounded-full h-8 px-3">
							<Settings className="h-4 w-4" />
							Manage
						</Button>
					</Link>
					<Link href={`/gallery/${event.id}`} className="col-span-1">
									<Button size="xs" variant="outline" className="w-full flex items-center gap-1 rounded-full h-8 px-3">
							<Eye className="h-4 w-4" />
							View
						</Button>
					</Link>
					<Link href={`/events/${event.eventCode}`} className="col-span-1">
									<Button size="xs" variant="outline" className="w-full flex items-center gap-1 rounded-full h-8 px-3">
							<ExternalLink className="h-4 w-4" />
							Guest
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

export default EventCard;

