// A new component for displaying code blocks with syntax highlighting.
'use client';
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    const copyToClipboardFallback = () => {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setHasCopied(true);
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        setHasCopied(true);
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      }).catch(() => {
        copyToClipboardFallback();
      });
    } else {
      copyToClipboardFallback();
    }
  };

  return (
    <div className="bg-muted text-muted-foreground rounded-md p-4 relative font-mono text-sm overflow-x-auto">
      <pre><code>{code}</code></pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={copyToClipboard}
      >
        {hasCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="sr-only">Copy code</span>
      </Button>
    </div>
  );
}
