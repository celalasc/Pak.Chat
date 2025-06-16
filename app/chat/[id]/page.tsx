"use client";
import ChatPage from "@/frontend/routes/ChatPage";

export default function Page({ params }: { params: { id: string } }) {
  return <ChatPage chatId={params.id} />;
}
