'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UserMenuClient({
  mobile = false,
  initialUser = null,
}: {
  mobile?: boolean;
  initialUser?: User | null;
}) {
  const { data: user } = useSWR<User | null>(
    '/api/user',
    fetcher,
    { fallbackData: initialUser ?? null }
  );
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    mutate('/api/user');
    router.push('/');
  }

  if (mobile) {
    if (!user) {
      return (
        <>
          <DropdownMenuItem>
            <a href="/api/auth/google" className="w-full">Sign in</a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/api/auth/google" className="w-full">Create free event</a>
          </DropdownMenuItem>
        </>
      );
    }
    return (
      <>
        <DropdownMenuItem>
          <a href="/dashboard/general" className="flex w-full items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <button type="button" className="flex w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </button>
        </DropdownMenuItem>
      </>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {/* Desktop actions */}
        <div className="hidden sm:flex gap-2 items-center">
          <Button asChild variant="ghost" className="rounded-full h-9 px-4">
            <a href="/api/auth/google">Sign in</a>
          </Button>
          <Button asChild className="rounded-full h-9 px-4">
            <a href="/api/auth/google">Create free event</a>
          </Button>
        </div>
        {/* Mobile actions */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <span className="sr-only">Open menu</span>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <a href="/api/auth/google" className="w-full">Sign in</a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <a href="/api/auth/google" className="w-full">Create free event</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Desktop user menu */}
      <div className="hidden sm:flex">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="cursor-pointer size-9">
              <AvatarImage alt={user.name || ''} />
              <AvatarFallback>
                {(user.email || user.name || '')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex flex-col gap-1">
            <DropdownMenuItem className="cursor-pointer">
              <a href="/dashboard/general" className="flex w-full items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Edit Profile</span>
              </a>
            </DropdownMenuItem>
            <form action={handleSignOut} className="w-full">
              <button type="submit" className="flex w-full">
                <DropdownMenuItem className="w-full flex-1 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Mobile user menu: hamburger */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <span className="sr-only">Open menu</span>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <a href="/dashboard/general" className="flex w-full items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Edit Profile</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button type="button" className="flex w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
