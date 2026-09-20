'use client';

import { useState, useEffect } from 'react';
import { Message } from '@ai-sdk/react';

export interface Bookmark {
  id: string;
  messageId: string;
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'portfolio_bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setBookmarks(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse bookmarks', e);
        }
      }
    }
  }, []);

  const addBookmark = (message: Message) => {
    const textContent = message.parts?.find(p => p.type === 'text')?.text || message.content;
    if (!textContent) return;

    // Clean up follow up questions from the text
    const cleanContent = textContent.replace(/FOLLOW_UP_QUESTIONS:[\s\S]*/, '').trim();

    const newBookmark: Bookmark = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      messageId: message.id,
      content: cleanContent,
      timestamp: Date.now(),
    };

    const newBookmarks = [newBookmark, ...bookmarks];
    setBookmarks(newBookmarks);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
    }
  };

  const removeBookmark = (messageId: string) => {
    const newBookmarks = bookmarks.filter(b => b.messageId !== messageId);
    setBookmarks(newBookmarks);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
    }
  };

  const isBookmarked = (messageId: string) => {
    return bookmarks.some(b => b.messageId === messageId);
  };

  return { bookmarks, addBookmark, removeBookmark, isBookmarked };
}
