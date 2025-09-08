export interface DemoEvent {
  id: string;
  name: string;
  // Add other event fields as needed
}

export interface DemoPhoto {
  id: string;
  originalFilename?: string;
  filename?: string;
  guestName?: string;
  uploadedByUser?: {
    name?: string;
  };
  // Add other photo fields as needed
}
