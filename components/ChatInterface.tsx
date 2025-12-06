"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { executeCommand } from "@/lib/commands";
import { CommandResult } from "@/lib/types";

interface Message {
  type: "input" | "output" | "error";
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  currentProjectId?: string;
  onTaskComplete?: () => void;
  onProjectChange?: (projectId: string) => void;
  onTaskAdded?: () => void; // Callback when task is added
  onFeatureAdded?: () => void; // Callback when feature is added
}

export default function ChatInterface({
  currentProjectId,
  onTaskComplete,
  onProjectChange,
  onTaskAdded,
  onFeatureAdded,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show welcome message on mount
    setMessages([
      {
        type: "output",
        content: `╔══════════════════════════════════════╗
║      WELCOME TO 15 MINUTES          ║
╚══════════════════════════════════════╝

Build great things, 15 minutes at a time.
Type 'help' to see available commands.
`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add input to messages
    const userMessage: Message = {
      type: "input",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);

    // Execute command
    const result: CommandResult = await executeCommand(input, {
      currentProjectId,
    });

    // Handle clear command
    if (result.data?.clear) {
      setMessages([]);
      setInput("");
      return;
    }

    // Add output to messages
    const outputMessage: Message = {
      type: result.success ? "output" : "error",
      content: result.message,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, outputMessage]);

    // Trigger celebration if task completed
    if (result.data?.celebrate && onTaskComplete) {
      onTaskComplete();
    }

    // Trigger refresh if task was added
    if (result.data?.task && onTaskAdded) {
      onTaskAdded();
    }

    // Trigger refresh if feature was added
    if (result.data?.feature && onFeatureAdded) {
      onFeatureAdded();
    }

    // Update project if switched or created
    if (result.data?.project && onProjectChange) {
      onProjectChange(result.data.project.id);
    }

    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;

      const newIndex =
        historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            {msg.type === "input" ? (
              <div className="text-green-400">
                <span className="text-green-500">{">"}</span> {msg.content}
              </div>
            ) : (
              <div
                className={
                  msg.type === "error" ? "text-red-400" : "text-gray-300"
                }
              >
                <pre className="whitespace-pre-wrap font-mono">
                  {msg.content}
                </pre>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-green-500">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-green-400 font-mono"
            placeholder="Type a command..."
            autoComplete="off"
            spellCheck={false}
          />
          <span className="text-green-400 animate-pulse">_</span>
        </div>
      </form>
    </div>
  );
}
