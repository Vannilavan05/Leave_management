/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Sparkles, Send, X, MessageSquare, Bot, ArrowRight, CornerDownLeft, Calendar } from 'lucide-react';

interface AIAssistantModalProps {
  onApplyDraftForm: (draft: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    halfDay: boolean;
  }) => void;
  employeeName: string;
}

export default function AIAssistantModal({ onApplyDraftForm, employeeName }: AIAssistantModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${employeeName}! I am your AI HR Assistant. I can check your leave balances, answer questions about company policies, identify public holidays, or pre-fill a leave application for you. Just type something like "Check my casual balance" or "I want to apply for sick leave next Monday".`,
      timestamp: new Date().toISOString(),
      suggestions: [
        'How many sick days do I have?',
        'Do I need a doctor certificate for sick leave?',
        'Apply for casual leave on July 7',
        'Can I carry over my annual leave?',
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Reconstruct payload containing history
      const historyPayload = messages.slice(-10).map((msg) => ({
        sender: msg.sender,
        text: msg.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: data.text,
          timestamp: new Date().toISOString(),
          parsedForm: data.parsedForm,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Server error speaking to AI.');
      }
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `My system connection encountered an issue: ${error.message || 'Please check your connection.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputValue);
    }
  };

  const applyDraftForm = (msg: ChatMessage) => {
    if (msg.parsedForm) {
      onApplyDraftForm({
        leaveTypeId: msg.parsedForm.leaveTypeId || 'casual',
        startDate: msg.parsedForm.startDate || '',
        endDate: msg.parsedForm.endDate || '',
        reason: msg.parsedForm.reason || '',
        halfDay: msg.parsedForm.halfDay || false,
      });
      // Close modal
      setIsOpen(false);
    }
  };

  const renderFormattedText = (rawText: string, hasForm: boolean) => {
    if (!rawText) return null;

    // Clean JSON code blocks if a form is present
    let text = rawText;
    if (hasForm) {
      text = rawText.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
    }

    const lines = text.split('\n');

    return (
      <div className="space-y-1 text-left">
        {lines.map((line, i) => {
          let content = line;
          let isListItem = false;

          const trimmed = line.trim();
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            content = trimmed.substring(2);
            isListItem = true;
          }

          // Parse bold (**bold**) and italics (*italics*)
          const parsedParts: React.ReactNode[] = [];
          
          const parseItalics = (textBlock: string, baseKey: string): React.ReactNode[] => {
            const res: React.ReactNode[] = [];
            let idx = 0;
            while (idx < textBlock.length) {
              const start = textBlock.indexOf('*', idx);
              if (start === -1) {
                res.push(textBlock.substring(idx));
                break;
              }
              res.push(textBlock.substring(idx, start));
              const end = textBlock.indexOf('*', start + 1);
              if (end === -1) {
                res.push(textBlock.substring(start));
                break;
              }
              const italicText = textBlock.substring(start + 1, end);
              res.push(
                <span key={`${baseKey}-ital-${start}`} className="italic text-slate-700">
                  {italicText}
                </span>
              );
              idx = end + 1;
            }
            return res;
          };

          let currentIdx = 0;
          let partCounter = 0;
          while (currentIdx < content.length) {
            const boldStart = content.indexOf('**', currentIdx);
            if (boldStart === -1) {
              parsedParts.push(...parseItalics(content.substring(currentIdx), `part-${partCounter++}`));
              break;
            }

            parsedParts.push(...parseItalics(content.substring(currentIdx, boldStart), `part-${partCounter++}`));
            const boldEnd = content.indexOf('**', boldStart + 2);
            if (boldEnd === -1) {
              parsedParts.push(...parseItalics(content.substring(boldStart), `part-${partCounter++}`));
              break;
            }

            const boldText = content.substring(boldStart + 2, boldEnd);
            parsedParts.push(
              <strong key={`bold-${boldStart}`} className="font-semibold text-slate-950">
                {boldText}
              </strong>
            );
            currentIdx = boldEnd + 2;
          }

          if (isListItem) {
            return (
              <div key={i} className="flex items-start gap-1.5 ml-1 pl-1 my-0.5">
                <span className="text-blue-500 font-bold select-none">•</span>
                <span className="flex-1 text-slate-800 font-medium">{parsedParts}</span>
              </div>
            );
          }

          return (
            <p key={i} className="min-h-[1.25rem] text-slate-800 leading-relaxed">
              {parsedParts}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Toggle Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        id="btn-ai-assistant-toggle"
        className="fixed bottom-6 right-6 h-14 w-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer z-50 group border border-blue-400/30"
        title="Speak to HR AI Assistant"
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping"></span>
        </span>
      </button>

      {/* Slide-out / Pop-up Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end transition-all duration-300">
          <div
            className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-100"
            id="ai-assistant-panel"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-indigo-500/25 rounded-xl border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold font-sans tracking-tight">AI HR Companion</h4>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Gemini 3.5 Flash Connected</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800/80 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex flex-col gap-1.5`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs leading-relaxed font-sans shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                      }`}
                    >
                      {/* Message Text (Clean Linebreaks and Asterisk Parsing) */}
                      {msg.sender === 'user' ? (
                        <p className="whitespace-pre-line text-white">{msg.text}</p>
                      ) : (
                        renderFormattedText(msg.text, !!msg.parsedForm)
                      )}

                      {/* Render Parsed JSON autofill actions as an interactive prompt */}
                      {msg.parsedForm && (
                        <div className="mt-3 border-t border-slate-100 pt-3 flex flex-col gap-2">
                          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/60 flex items-start gap-2.5 text-slate-700">
                            <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-[11px]">
                              <span className="font-bold text-slate-800 block">AI Drafted Leave Form Details</span>
                              <span className="block text-slate-500 mt-0.5 font-mono">
                                {msg.parsedForm.leaveTypeId?.toUpperCase()} Leave • {msg.parsedForm.startDate} to {msg.parsedForm.endDate}
                              </span>
                              <span className="block text-slate-500 mt-0.5">
                                "{msg.parsedForm.reason}"
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => applyDraftForm(msg)}
                            className="bg-blue-600 text-white text-[11px] font-semibold py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs font-sans"
                          >
                            <span>Pre-fill Leave Application Form</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Meta Time */}
                    <span className={`text-[10px] text-slate-400 font-mono ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Suggestions Chip */}
                    {msg.sender === 'assistant' && msg.suggestions && (
                      <div className="flex flex-wrap gap-1.5 mt-1 max-w-full">
                        {msg.suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSendMessage(s)}
                            className="text-[11px] text-blue-600 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 px-2.5 py-1 rounded-lg transition-all text-left cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 rounded-2xl rounded-tl-none px-4 py-3 text-xs border border-slate-100 shadow-xs flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    <span className="text-slate-400 font-sans ml-1">AI Companion is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Ask about leave policies, holiday schedule, or check leave quotas..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                id="input-ai-chat"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-sans"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                id="btn-ai-chat-send"
                className="bg-blue-600 text-white h-9 w-9 rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-xs flex-shrink-0"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
