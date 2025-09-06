'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UserMenu({ mobile = false }: { mobile?: boolean } = {}) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    mutate('/api/user');
    router.push('/');
  }

  if (mobile) {
    // Render user actions as DropdownMenuItems for mobile combined menu
    if (!user) {
      return (
        <>
          <DropdownMenuItem>
            <Link href="/api/auth/google" className="w-full">Sign in</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/api/auth/google" className="w-full">Create free event</Link>
          </DropdownMenuItem>
        </>
      );
    }
    return (
      <>
        <DropdownMenuItem>
          <Link href="/dashboard/general" className="flex w-full items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </Link>
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

  // Responsive: show desktop menu, and mobile menu
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {/* Desktop actions */}
        <div className="hidden sm:flex gap-2 items-center">
          <Button asChild variant="ghost" className="rounded-full h-9 px-4">
            <Link href="/api/auth/google">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full h-9 px-4">
            <Link href="/api/auth/google">Create free event</Link>
          </Button>
        </div>
        {/* Mobile actions: show as menu/hamburger */}
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
                <Link href="/api/auth/google" className="w-full">Sign in</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/api/auth/google" className="w-full">Create free event</Link>
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
                {user.email
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex flex-col gap-1">
            <DropdownMenuItem className="cursor-pointer">
              <Link href="/dashboard/general" className="flex w-full items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
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
              <Link href="/dashboard/general" className="flex w-full items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
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
