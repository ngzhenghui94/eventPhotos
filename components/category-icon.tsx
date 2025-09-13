"use client";
import React from 'react';
import { Calendar, Users, Heart, Gift, PartyPopper, Plane, Presentation, Building2, Trophy, Sun, Sparkles, HelpCircle } from 'lucide-react';

export type CategoryType =
  | 'General'
  | 'Wedding'
  | 'Birthday'
  | 'Party'
  | 'Travel'
  | 'Event'
  | 'Conference'
  | 'Reunion'
  | 'Festival'
  | 'Corporate'
  | 'Sports'
  | 'Holiday'
  | 'Other'
  | string;

type Props = {
  category?: CategoryType | null;
  className?: string;
};

export function CategoryIcon({ category, className }: Props) {
  const sizeClasses = className || "h-6 w-6";
  switch (category) {
    case 'Wedding':
      return (<Heart className={`${sizeClasses} text-pink-500`} />);
    case 'Birthday':
      return (<Gift className={`${sizeClasses} text-blue-500`} />);
    case 'Party':
      return (<PartyPopper className={`${sizeClasses} text-yellow-500`} />);
    case 'Travel':
      return (<Plane className={`${sizeClasses} text-green-500`} />);
    case 'Event':
      return (<Calendar className={`${sizeClasses} text-purple-500`} />);
    case 'Conference':
      return (<Presentation className={`${sizeClasses} text-indigo-500`} />);
    case 'Reunion':
      return (<Users className={`${sizeClasses} text-teal-500`} />);
    case 'Festival':
      return (<Sparkles className={`${sizeClasses} text-orange-500`} />);
    case 'Corporate':
      return (<Building2 className={`${sizeClasses} text-gray-700`} />);
    case 'Sports':
      return (<Trophy className={`${sizeClasses} text-red-500`} />);
    case 'Holiday':
      return (<Sun className={`${sizeClasses} text-emerald-500`} />);
    case 'Other':
      return (<HelpCircle className={`${sizeClasses} text-gray-400`} />);
    case 'General':
    default:
      return (<Calendar className={`${sizeClasses} text-gray-300`} />);
  }
}

export default CategoryIcon;


