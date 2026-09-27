'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { chatService, ChatContactDto, ChatMessageDto } from '@/services/nutriServices';

interface ChatWidgetProps {
  initialContactId?: string;
  onClose?: () => void;
  isFloating?: boolean;
}

export function ChatWidget({ initialContactId, onClose, isFloating = true }: ChatWidgetProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [isOpen, setIsOpen] = useState(!isFloating);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('Client');

  const [contacts, setContacts] = useState<ChatContactDto[]>([]);
  const [activeContact, setActiveContact] = useState<ChatContactDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestions based on role
  const quickSuggestions = currentUserRole === 'Client'
    ? [
        isEn ? 'I logged my lunch today according to plan! 🥗' : 'บันทึกมื้อกลางวันตามแผนเรียบร้อยแล้วครับ 🥗',
        isEn ? 'Could we adjust my daily carb targets?' : 'อยากขอปรึกษาปรับลดคาร์โบไฮเดรตครับ 🌾',
        isEn ? 'Need assistance with system features.' : 'ต้องการสอบถามเรื่องการใช้งานระบบครับ 🛡️',
        isEn ? 'Thank you for the dietary guidance! 🙏' : 'ขอบคุณสำหรับคำแนะนำครับ 🙏'
      ]
    : [
        isEn ? 'How are you feeling with this week\'s meal plan?' : 'สัปดาห์นี้การทานอาหารตามแผนเป็นอย่างไรบ้างคะ? 🥗',
        isEn ? 'Remember to stay hydrated (2.5 - 3L daily) 💧' : 'อย่าลืมดื่มน้ำสะอาดให้เพียงพอวันละ 2.5-3 ลิตรนะคะ 💧',
        isEn ? 'Feel free to scan your meals with the AI camera!' : 'สามารถใช้ AI กล้องช่วยสแกนบันทึกอาหารได้เลยนะคะ 📸',
        isEn ? 'Your compliance score looks fantastic! 💪' : 'สถิติความสม่ำเสมอในการทานอาหารยอดเยี่ยมมากค่ะ! 💪'
      ];

  // Load user session
  useEffect(() => {
    const userId = localStorage.getItem('nutriplan_user_id') || '22222222-2222-2222-2222-222222222222';
    const userName = localStorage.getItem('nutriplan_user_name') || 'สมศักดิ์ สุขภาพดี (John Doe)';
    const userRole = localStorage.getItem('nutriplan_user_role') || 'Client';

    setCurrentUserId(userId);
    setCurrentUserName(userName);
    setCurrentUserRole(userRole);
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const contactList = await chatService.getContacts(currentUserId);
      setContacts(contactList);

      const unreadSum = contactList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setTotalUnread(unreadSum);

      if (initialContactId) {
        const found = contactList.find(c => c.contactId === initialContactId);
        if (found) setActiveContact(found);
      } else if (!activeContact && contactList.length > 0 && !isFloating) {
        setActiveContact(contactList[0]);
      }
    } catch (e) {
      console.error('Failed to load chat contacts:', e);
    }
  }, [currentUserId, initialContactId, activeContact, isFloating]);

  useEffect(() => {
    if (currentUserId) {
      setIsLoadingContacts(true);
      fetchContacts().finally(() => setIsLoadingContacts(false));
    }
  }, [currentUserId, fetchContacts]);

  // Load messages & Real-time Auto-Polling
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!activeContact || !currentUserId) return;
    if (isInitial) setIsLoadingMessages(true);
    try {
      const history = await chatService.getMessages(currentUserId, activeContact.contactId);
      setMessages(prev => {
        // Only update state if message count or content changed to avoid jitter
        if (prev.length === history.length && prev[prev.length - 1]?.id === history[history.length - 1]?.id) {
          return prev;
        }
        return history;
      });

      if (isInitial) {
        await chatService.markAsRead(activeContact.contactId, currentUserId);
        setContacts(prev => prev.map(c => c.contactId === activeContact.contactId ? { ...c, unreadCount: 0 } : c));
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      if (isInitial) setIsLoadingMessages(false);
    }
  }, [activeContact, currentUserId]);

  // Trigger load when active contact changes
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Live Auto-Polling interval (every 1.5s) when chat is active
  useEffect(() => {
    if (!activeContact || !currentUserId) return;
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 1500);

    return () => clearInterval(interval);
  }, [activeContact, currentUserId, fetchMessages]);

  // Cross-tab and window instant synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('nutriplan_chat_sync');
      channel.onmessage = (event) => {
        const { type, message } = event.data || {};
        if (type === 'NEW_MESSAGE' && message) {
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
          fetchContacts();
        }
      };
    } catch { }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nutriplan_chat_last_sync' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          fetchContacts();
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchContacts]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingMessages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeContact || !currentUserId) return;

    const payload = {
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      receiverId: activeContact.contactId,
      receiverName: activeContact.contactName,
      message: textToSend.trim()
    };

    if (!customText) setInputText('');

    try {
      const sent = await chatService.sendMessage(payload);
      setMessages(prev => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [...prev, sent];
      });

      // Broadcast immediately to other window/tab
      try {
        const channel = new BroadcastChannel('nutriplan_chat_sync');
        channel.postMessage({ type: 'NEW_MESSAGE', message: sent });
        channel.close();
      } catch { }
      try {
        localStorage.setItem('nutriplan_chat_last_sync', JSON.stringify(sent));
      } catch { }

      // Update contact list preview
      setContacts(prev => prev.map(c => {
        if (c.contactId === activeContact.contactId) {
          return {
            ...c,
            lastMessage: textToSend.trim(),
            lastMessageTime: new Date().toISOString()
          };
        }
        return c;
      }));
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  // Determine if a message bubble belongs to current user
  const checkIsMe = (msg: ChatMessageDto) => {
    if (msg.senderId && currentUserId && msg.senderId.toLowerCase() === currentUserId.toLowerCase()) {
      return true;
    }

    if (currentUserId.includes('1111') || currentUserRole === 'Nutritionist') {
      return msg.senderId.includes('1111') || msg.senderRole === 'Nutritionist';
    }

    if (currentUserId.includes('2222') || currentUserRole === 'Client') {
      return msg.senderId.includes('2222') || msg.senderRole === 'Client';
    }

    if (currentUserId.toLowerCase().includes('admin') || currentUserRole === 'Admin') {
      return msg.senderId.toLowerCase().includes('admin') || msg.senderRole === 'Admin';
    }

    return false;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'Admin') return { label: 'Platform Admin', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    if (role === 'Nutritionist') return { label: 'Specialist RDN', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    return { label: 'Active Client', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {isFloating && !isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            fetchContacts();
          }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold p-3.5 sm:px-5 sm:py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2.5 border border-emerald-400/40 ring-4 ring-emerald-500/20 cursor-pointer"
        >
          <span className="text-xl">💬</span>
          <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">
            {isEn ? 'Direct In-App Chat' : 'พูดคุย / ปรึกษาผู้เชี่ยวชาญ'}
          </span>
          {totalUnread > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Main Chat Modal / Window */}
      {(isOpen || !isFloating) && (
        <div className={isFloating ? "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[460px] h-[580px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300" : "w-full h-[600px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden"}>
          
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {activeContact && (
                <button
                  onClick={() => setActiveContact(null)}
                  className="text-slate-400 hover:text-emerald-400 text-xs font-bold p-1 -ml-1 rounded transition-colors"
                  title={isEn ? 'Back to Contacts' : 'กลับสู่รายชื่อผู้ติดต่อ'}
                >
                  ←
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border shadow-sm ${
                    activeContact
                      ? (activeContact.contactRole === 'Admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : activeContact.contactRole === 'Nutritionist' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40')
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    {activeContact ? activeContact.contactName.charAt(0).toUpperCase() : '💬'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950"></span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 leading-tight">
                    <span>{activeContact ? activeContact.contactName : (isEn ? 'NutriPlan In-App Direct Chat' : 'ระบบแชทและติดต่อสื่อสาร NutriPlan')}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    {activeContact ? (
                      <>
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] font-semibold ${getRoleBadge(activeContact.contactRole).bg}`}>
                          {getRoleBadge(activeContact.contactRole).label}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-medium">Online</span>
                      </>
                    ) : (
                      <span>{isEn ? 'Select a contact to message' : 'เลือกผู้ติดต่อเพื่อเริ่มสนทนา'}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {isFloating && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onClose) onClose();
                }}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all text-xs"
                title={t('common.close', 'Close')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Content Area: Either Contact List or Active Thread */}
          {!activeContact ? (
            /* Contact List View */
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="px-2 py-1.5 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isEn ? 'Available Contacts' : 'รายชื่อผู้ติดต่อที่พร้อมสนทนา'}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {contacts.length} {isEn ? 'Active' : 'ออนไลน์'}
                </span>
              </div>

              {isLoadingContacts ? (
                <div className="text-center text-slate-500 py-12 text-xs">
                  {isEn ? 'Loading contacts...' : 'กำลังโหลดรายชื่อผู้ติดต่อ...'}
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center text-slate-500 py-12 text-xs italic">
                  {isEn ? 'No contacts available.' : 'ไม่มีรายชื่อผู้ติดต่อ'}
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.contactId}
                    onClick={() => setActiveContact(contact)}
                    className="bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${
                        contact.contactRole === 'Admin'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : contact.contactRole === 'Nutritionist'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {contact.contactName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-200 text-xs group-hover:text-emerald-300 transition-colors truncate">
                            {contact.contactName}
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${getRoleBadge(contact.contactRole).bg}`}>
                            {getRoleBadge(contact.contactRole).label}
                          </span>
                        </div>
                        {contact.specialization && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {contact.specialization}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 italic">
                          {contact.lastMessage}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[9px] text-slate-500 block">
                        {formatMessageTime(contact.lastMessageTime)}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span className="mt-1 inline-flex bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Active Conversation View */
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="text-center text-slate-500 py-12 text-xs">
                    {isEn ? 'Loading conversation history...' : 'กำลังโหลดประวัติการสนทนา...'}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-500 py-12 text-xs space-y-2">
                    <p>👋 {isEn ? 'No messages yet. Send a greeting to start!' : 'ยังไม่มีข้อความ เริ่มต้นการสนทนาได้ทันที!'}</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = checkIsMe(msg);
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                          <span className="font-semibold">{isMe ? (isEn ? 'You' : 'คุณ') : msg.senderName}</span>
                          <span>•</span>
                          <span>{formatMessageTime(msg.timestamp)}</span>
                        </div>

                        <div
                          className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                            isMe
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-medium rounded-tr-none'
                              : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/60 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                {quickSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="bg-slate-900 hover:bg-emerald-950/60 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 border border-slate-800 text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer"
                  >
                    ⚡ {suggestion}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isEn ? 'Type your message here...' : 'พิมพ์ข้อความเพื่อพูดคุยหรือปรึกษา...'}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>{isEn ? 'Send' : 'ส่ง'}</span>
                    <span>➤</span>
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      )}
    </>
  );
}
