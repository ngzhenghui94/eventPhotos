import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Camera } from 'lucide-react';
import Link from 'next/link';

export default function GuestNotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Event Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              The event code you're looking for doesn't exist or may have been removed.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Camera className="h-5 w-5 text-amber-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-900">
                    Looking for an event?
                  </p>
                  <p className="text-sm text-amber-800">
                    Double-check the event code with the event organizer
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/">
                <Button className="w-full">
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}