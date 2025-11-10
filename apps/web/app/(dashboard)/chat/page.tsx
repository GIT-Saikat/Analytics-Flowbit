"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { chatWithData } from "@/lib/api";
import { Send, Loader2, Database, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  query: string;
  sql?: string;
  results?: Record<string, unknown>[];
  error?: string;
  loading?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!query.trim()) return;

    const messageId = Date.now().toString();
    const newMessage: Message = {
      id: messageId,
      query: query.trim(),
      loading: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      const response = await chatWithData({
        query: newMessage.query,
      });

      if (response.success && response.data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  sql: response.data!.sql,
                  results: response.data!.results,
                  loading: false,
                }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  error: response.error || "Failed to process query",
                  sql: response.sql,
                  loading: false,
                }
              : msg
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                error: error instanceof Error ? error.message : "An unexpected error occurred",
                loading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderResults = (results: Record<string, unknown>[]) => {
    if (!results || results.length === 0) {
      return <div className="text-sm text-gray-500">No results found</div>;
    }

    const keys = Object.keys(results[0]);

    return (
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {keys.map((key) => (
                <th key={key} className="border-b px-4 py-2 text-left font-semibold text-gray-700">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {keys.map((key) => (
                  <td key={`${idx}-${key}`} className="px-4 py-2 text-gray-900">
                    {String(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {results.length > 10 && (
          <div className="border-t bg-gray-50 px-4 py-2 text-center text-xs text-gray-600">
            Showing 10 of {results.length} rows
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="flex h-full flex-col overflow-hidden px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chat with Data</h1>
        <p className="text-sm text-gray-600">
          Ask natural language questions about your invoice data using self-hosted Vanna AI
        </p>
      </div>

      {/* Messages Area */}
      <div className="mb-4 flex-1 space-y-4 overflow-y-auto rounded-lg border bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Database className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              Start a conversation with your data
            </h3>
            <p className="mb-4 max-w-md text-sm text-gray-600">Ask questions like:</p>
            <div className="space-y-2 text-left text-sm text-gray-700">
              <p>• &ldquo;What&apos;s the total spend in the last 90 days?&rdquo;</p>
              <p>• &ldquo;List top 5 vendors by spend.&rdquo;</p>
              <p>• &ldquo;Show overdue invoices as of today.&rdquo;</p>
              <p>• &ldquo;What is the average invoice amount?&rdquo;</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  {message.query}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {message.loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing query...</span>
                  </div>
                ) : message.error ? (
                  <div className="rounded-lg bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900">Error</p>
                        <p className="text-sm text-red-700">{message.error}</p>
                      </div>
                    </div>
                    {message.sql && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-red-900">Generated SQL:</p>
                        <pre className="mt-1 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-800">
                          {message.sql}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {message.sql && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-gray-700">Generated SQL:</p>
                        <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-800">
                          {message.sql}
                        </pre>
                      </div>
                    )}
                    {message.results && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-gray-700">
                          Results ({message.results.length} rows):
                        </p>
                        {renderResults(message.results)}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ask a question about your data..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleSendMessage();
            }
          }}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSendMessage} disabled={isLoading || !query.trim()} className="px-6">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </section>
  );
}